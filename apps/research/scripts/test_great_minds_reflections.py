"""Guard destructive catalog changes against partial audit publication."""
import hashlib,json,tempfile,unittest
from pathlib import Path
from great_minds_reflections import apply_reflection_review
class ReflectionReviewTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);self.csv=self.root/'source.csv';self.csv.write_text('frozen source\n');self.manifest=self.root/'review.json'
  self.baseline=[dict(id='gm-kept',name='Kept',url='https://example.org/kept'),dict(id='gm-removed',name='Removed',url='https://example.org/removed')]
  self.record={**self.baseline[0], 'collection':'great-minds','perspective':'A sourced account of practice.','perspectiveSourceUrl':'https://example.org/interview','readingPaths':[dict(title='An interview',url='https://example.org/interview',kind='interview',whyRead='An account of problem choice.',sourceUrl='https://example.org/interview')]}
  self.review=dict(status='REVIEWED',reviewedAt='2026-10-15',baselineCsvSha256=hashlib.sha256(self.csv.read_bytes()).hexdigest(),decisions=[dict(id='gm-kept',decision='QUALIFY',reason='Interview verified.'),dict(id='gm-removed',decision='WITHHOLD',reason='No qualifying work verified.')],records=[self.record])
 def apply(self):
  self.manifest.write_text(json.dumps(self.review));return apply_reflection_review(self.baseline,self.csv,self.manifest)
 def test_review_removes_only_active_projection_preserving_kept_identity_and_source(self):
  before=self.csv.read_bytes();result=self.apply();self.assertEqual([x['id'] for x in result],['gm-kept']);self.assertEqual(result[0]['url'],self.baseline[0]['url']);self.assertEqual(self.csv.read_bytes(),before);self.assertEqual(len(self.baseline),2)
 def test_partial_audit_cannot_publish_a_smaller_catalog(self):
  self.review['decisions'].pop()
  with self.assertRaisesRegex(ValueError,'every baseline ID'):self.apply()
 def test_changed_identity_cannot_orphan_saved_annotations(self):
  self.record['name']='Renamed'
  with self.assertRaisesRegex(ValueError,'annotation identity'):self.apply()
 def test_stale_baseline_cannot_silently_reapply_old_decisions(self):
  self.csv.write_text('changed source\n')
  with self.assertRaisesRegex(ValueError,'baseline changed'):self.apply()
 def test_private_annotation_cannot_be_bundled_as_source_data(self):
  self.record['privateNotes']='secret'
  with self.assertRaisesRegex(ValueError,'Private annotations'):self.apply()
if __name__=='__main__':unittest.main()
