---
title: Recon
layout: layouts/post
section: "odyssey"
category: "Security"
description: "A working reference for bug bounty recon: horizontal and vertical asset correlation, subdomain enumeration, OSINT tooling, and early exploitation wins."
tags: ["security", "tech", "practical"]
published: 2026-07-11
lastUpdated: 2026-07-11
---

https://m0chan.github.io/2019/12/17/Bug-Bounty-Cheetsheet.html
learn to use xargs

## Regional assets
- use shodan/censys to find it using same html properties
- copyright find


- There's quality bugs within your reach
- scan to learn
- just try it
## Phase 1
- **Horizontal correlation**: The idea behind horizontal correlation is to find all assets  related to a company. This could be acquisitions, CIDR ranges, and domains that  are owned by the same person.
- email finder [h8mail](https://github.com/khast3x/h8mail) [emailfinder](https://github.com/Josue87/EmailFinder)
	- Acqasitions(Max-depth)
	- CIDR
	- ASN [mxtools](https://mxtoolbox.com/asn.aspx)
	- Reverse Whois [viewdns.info](https://viewdns.info/reversewhois)
	- Reverse DNS
	- Favicon hash 
		- murmur hash to get hash
		- shodan : http.favicon.hash
	- **Amass** 
		- gether potential asn's `amass intel -org company_name`
		- cidr range form asn -> `whois -h whois.radb.net -- '-i origin <ASN NumberHere>' | grep -Eo "([0-  9.]+){4}/[0-9]+" | sort -u`
		- find domain on cidr `amass intel -ip -cidr cidr_range`
		- for each asn `amass intel -asn asn_number` -> root_domains a.k.a seeds
		-  for each domain -> reverse IP lookup `amass intel -whois -d domain_name`
		- ip2host [hakluke](go install github.com/hakluke/hakip2host@latest)
- Implementation of Phase 1
	- dorking
		- `site:*.*.*.yahoo.com`
		- `intext:"© Example Inc."`
		- `site:https://scribd.com | site:http://ideone.com | site:http://codepad.org | site:http://codebeautify.org | site:http://codeshare.io | site:http://codepen.io | site:http://repl.it | site:http://justpaste.it | site:http://pastebin.com | site:http://jsfiddle.net | site:http://trello.com "target"`
		- `site:s3.amazonaws.com + inurl:company_name)`
		- `Google Dork: site.com +inurl:dev -cdn`
		- scribd, npmjs, npm.runkit, libreries.io, coggle.it, papaly, trello, prezi, jsdelivr, CI-servieces,  codepen, pastebin, throwbin.io, anonfiles.com, repl, gitter.im, bitbucket, atlassian, gitlab use with site: dork + gists
		- site:[http://ideone.com](https://t.co/AnRjfXTV5r) “apikey” site:[http://ideone.com](https://t.co/AnRjfXTV5r) “aws_access_key_id”
		- content: using ext:php etc. `site:DOMAIN AND (ext:xslx OR docx OR pdf)
		- [google hacking database](https://www.exploit-db.com/google-hacking-database) if you see java search java 
	- File metadata
		- FOCA [git](https://github.com/ElevenPaths/FOCA)
	- shodan
		- `Shodan query tip: If "ssl:<domain>" doesn't return anything try "[http://ssl.cert.subject.CN](https://t.co/3zFKGqfgwg):<domain>"`
		- `asn:number`
		- `net:64.233.160.0/19` `org:google`
	- domain analysis
		- [domain analyser](https://github.com/eldraco/domain_analyzer/issues) ````
		- `python domain_analyzer.py -d DOMAIN -w -j -n -a
		- My go-to tool for passive content is [Wayback Machin](https://web.archive.org/)
		- historical dns data `https://securitytrails.com/dns-trails`
		- harpoon [git](https://github.com/Te-k/harpoon)
	- people
		- [username](https://namechk.com/)
	- organization
		- look for job posting, careers
		- look for employees + stackshare.io
		- stackoverflow + company
		- DNS cache poisoning `dig @DNS_SERVER -t A DOMAIN_TO_CHECK +norecurse`
		- public secrets [gitleaks](https://github.com/zricethezav/gitleaks) trufflehog
		- pastesites [pastehunter](https://github.com/kevthehermit/PasteHunter)
		- bukets [ultimate](https://buckets.grayhatwarfare.com)
	- DNS Enumeration

## Phase 2
- **Verticle Correlation**: Vertical correlation when dealing with domains  involves finding all subdomains belonging to a single domain.
- repeat subdomain enum after getting wordlist too

- **choosing right wordlist**
	- In case a program has an Android/IOS app, extract endpoints and add those to your wordlists before running directory bruteforce on the subdomains list. You'll be surprised to see the results [apkleaks](https://github.com/dwisiswant0/apkleaks) 
	- `apkurlgrep -a path/to/file.apk
	- Custom Wordlist [implemented]  [getjswords.py](https://github.com/m4ll0k/BBTz/blob/master/getjswords.py) 
	- [stats-subs-wordlist](https://github.com/zzzteph/substats)
	- SecLists
	- wordlists - [assetnote](https://wordlists.assetnote.io/)
		   1. Always fuzz the application with the "Language" specific wordlists. Ex, if the app is running "PHP", make sure to use the wordlist that is more inclusive of PHP:
		   2. server/technology specific like apache
		   3. Target specific wordlist(from JS files) burp word-extractor plugin [JSFScan](https://github.com/KathanP19/JSFScan.sh)
		   
		
	- Robots disallow - updated list will help more - [Implemented]
		- `roboxtractor -u domain.com -m 0 -wb -v > robots_disallow.txt`
		- `cat subdomains_raw.txt | roboxtractor -m 0 -v -wb > robots_disallow.txt`

- **Subdomain Enumeration**

	- **Passive**
		- sources [58](https://gist.github.com/sidxparab/22c54fd0b64492b6ae3224db8c706228)
		- Passive DNS gathering tools
			- Amass - 58 sources
				- [config reference](https://gist.github.com/sidxparab/4cd40d6e2f9422a005b06f19919200d0)
				- `amass enum -passive -d example.com -config config.ini -o output.txt`
			- subfinder - 32 sources
				- `subfinder -d example.com -all -v -config ~/.confg/subfinder/config.yaml -o subfinder_raw.txt`
				- use sort -u to remove dups
		- Internet Archive
			- [Gauplus](https://github.com/bp0lr/gauplus) | unfurl -domain
			- ` gauplus -t 5 -random-agent -subs example.com |  unfurl -u domains | anew subs_gau.txt`
			- `waybackurls example.com |  unfurl -u domains | sort -u > subs_waybackurls.txt`
		- Github Scraping
			- [github-subdomains](https://github.com/gwen001/github-subdomains) by gwen0001
			- `github-subdomains -d example.com -t tokens.txt -o subs_github.txt`
		- Rapid7 Project Sonar
			- [crobat](https://github.com/Cgboal/SonarSearch)
			- `crobat -s example.com | sort -u > subs_sonar.txt`output
		- crtificate logs [TODO write tool to automonitor changes]
			- [ctfr](https://github.com/UnaPibaGeek/ctfr)
			- `python3 ~/bb/tools/ctfr/ctfr.py -d target.com -o subs_ctfr.txt`
			- one liners
				- `curl "https://tls.bufferover.run/dns?q=.dell.com" | jq -r .Results[] | cut -d ',' -f4 | grep -F ".dell.com" | anew -q output.txt`
				- `curl -s https://dns.bufferover.run/dns?q=.getadmiral.com |jq -r .FDNS_A[]|cut -d',' -f2|sort -u| anew -q subs_bufferover.txt`
		- Recursive Enumeration
			- again run Amass, Subfinder, assetfinder on each sub
			- The Point to note here is that if you are using some paid API keys from passive sources this single script and eat-up all your quota.
			- `for sub in $( ( cat subdomains.txt | rev | cut -d '.' -f 3,2,1 | rev | sort | uniq -c | sort -nr | grep -v '1 ' | head -n 10 && cat subdomains.txt | rev | cut -d '.' -f 4,3,2,1 | rev | sort | uniq -c | sort -nr | grep -v '1 ' | head -n 10 ) | sed -e 's/^[[:space:]]*//' | cut -d ' ' -f 2);do subfinder -d example.com-all -silent | anew -q passive_recursive.txt assetfinder --subs-only example.com | anew -q passive_recursive.txt findomain --quiet -t example | anew -q passive_recursive.txt done`

	- **Active**
		- DNS Bruteforcing
			- to get list of valid resolvers [dnsvalidator](https://github.com/vortexau/dnsvalidator)
			- `dnsvalidator -tL https://public-dns.info/nameservers.txt -threads 100 -o resolvers.txt`
			- [puredns](https://github.com/d3mondev/puredns) use -l flag 2000-10000https://github.com/vortexau/dnsvalidator```
			- `puredns bruteforce wordlist.txt example.com -r resolvers.txt -w subs_bruteforced.txt`
			- which dns wordlist to usednsvalidator
				- [assesnote](https://wordlists-cdn.assetnote.io/data/manual/best-dns-wordlist.txt) 9M only use with VPN 
				- [six2dez wordlist for home](https://gist.github.com/six2dez/a307a04a222fab5a57466c51e1569acf/raw)
		- Permutation/Alterations
			- word list [six2dez](https://gist.githubusercontent.com/six2dez/ffc2b14d283e8f8eff6ac83e20a3c4b4/raw) (We can improve on this)
			- [gotator](https://github.com/Josue87/gotator)
			- ` gotator -sub subdomains.txt -perm permutations_list.txt -depth 1 -numbers 10 -mindup -adv -md > subs_gotator.txt`
			- `puredns resolve permutations.txt -r resolvers.txt` -> for resolving 
		- Scraping(JS/Source code)
			- [Gospider](https://github.com/jaeles-project/gospider)
			- `cat subdomains.txt | httpx -random-agent -retries 2 -no-color -o probed_tmp_scrap.txt` -> probing
			- `gospider -S probed_tmp_scrap.txt --js -t 50 -d 3 --sitemap --robots -w -r > subs_gospider.txt` -> try hakrawler
			- will generate huge traffic on target
			- `sed -i '/^.\{2048\}./d' subs_gospider.txt`
			- `cat subs_gospider.txt | grep -Eo 'https?://[^ ]+' | sed 's/]$//' | unfurl -u domains | grep ".example.com$" | sort -u scrap_subs_gospider.txt`
			- `puredns resolve scrap_subs_gospider.txt -w scrap_subs_gopider_resolved.txt -r resolvers.txt ` -> resolving
		- Google analytics
			- [AnalyticsRelationship](https://github.com/Josue87/AnalyticsRelationships)
			- `./analyticsrelationships --url https://www.bugcrowd.com`
		- TLS, CSP, CNAME Probing
			- [cero](https://github.com/glebarez/cero) `cero in.search.yahoo.com | sed 's/^*.//' | grep -e "\." | anew `
			- csp probing `cat subdomains.txt | httpx -csp-probe -status-code -retries 2 -no-color | anew csp_probed.txt | cut -d ' ' -f1 | unfurl -u domains | anew -q csp_subdomains.txt`
			- cname `dnsx -retry 3 -cname -l subdomains.txt`
		- VHOST Probing
			- Name based virtual host [Hosthunter](https://github.com/SpiderLabs/HostHunter)
				- fuff  -w  dnswordlist  -u http://host/ -H "Host: FUZZ.domain.com" -k -mc 200, 204, 301, 302, 307, 401, 403, 500
				- use wordlist of unresolved domains
			- `python3 hosthunter.py ip_addresses.txt`
			- bruteforce `gobuster vhost -u https://example.com -t 50 -w subdomains.txt`
		- TODO
			- -> CORS bruteforcing
			- -> Bucket Bruteforcing
	- Web Probing
		- httpx
		- `cat hosts.txt | httpx -follow-redirects -status-code -random-agent -o output.txt`
		- common ports [unimap](https://github.com/Edu4rdSHL/unimap) [88](https://gist.github.com/sidxparab/459fa5e733b5fd3dd6c3aac05008c21c)
			- `COMMON_PORTS_WEB="81,300,591,593,832,981,1010,1311,1099,2082,2095,2096,2480,3000,3128,3333,4243,4567,4711,4712,4993,5000,5104,5108,5280,5281,5601,5800,6543,7000,7001,7396,7474,8000,8001,8008,8014,8042,8060,8069,8080,8081,8083,8088,8090,8091,8095,8118,8123,8172,8181,8222,8243,8280,8281,8333,8337,8443,8500,8834,8880,8888,8983,9000,9001,9043,9060,9080,9090,9091,9200,9443,9502,9800,9981,10000,10250,11371,12443,15672,16080,17778,18091,18092,20720,32000,55440,55672"`
			- `sudo unimap --fast-scan -f subdomains.txt --ports $COMMON_PORTS_WEB -q -k --url-output > unimap_commonweb.txt`
			- `cat unimap_commonweb.txt | httpx -random-agent -status-code -silent -retries 2 -no-color | cut -d ' ' -f1 | tee probed_common_ports.txt` -> for web
	- Taking it to [Next](https://sidxparab.gitbook.io/subdomain-enumeration-guide/automation) level
		- something missing [dnsrecon](https://github.com/darkoperator/dnsrecon) [xfg](https://github.com/XAMFRA/XGS) [shodan-dorks](https://github.com/kh4sh3i/Shodan-Dorks) [gdorks](https://github.com/Proviesec/google-dorks)
	- Screenshoting
		- Manually check if possible
	- cat my_targets.txt | xargs -I %% bash -c 'echo "http://%%/favicon.ico"' > targets.txt
	- `python3 favihash.py -f https://target/favicon.ico -t targets.txt -s`
		
### web app hacking
- Dork-> site:http://target.com intitle:index.of or index.dir
	- 1. site:http://site.com ext:xml | ext:conf | ext:cnf | ext:reg | ext:inf | ext:rdp | ext:cfg | ext:txt ext:ora | ext:ini
- port scanning
	- refer Nmap
- Content Discovery
	- crawl
	- waybackurls & gau
	- Directory bruteforce [fuff]
		- feroxbuster
		- `feroxbuster -t 5 -L 2 -A -smart -v -o ferox.txt --auto-tune -w wordlist.txt -u url`
		- `feroxbuster --url https://host*com -w wordlist.txt --methods POST,GET,PUT,PATCH,DELETE` -> might wanna check delete manually
		- `ffuf -w /media/jd/Personal/037/bb/wordlists/asp_aspx_iis.txt -u https://sendersupport.olc.protection.outlook.com/FUZZ -fc 302`
	- [kiterunner](https://github.com/assetnote/kiterunner) for API's [read](https://blog.assetnote.io/2021/04/05/contextual-content-discovery/)
	- Inspecting Javascript files
		- jssearch
		- [gitdorker_go](https://github.com/damit5/gitdorks_go)
	- Parameter Discovery
		- x8 + arjun
	- Tech Stack [whatweb + wapplyzer + wafw00f + shodan]
	- Github dorking
		- [dorks](https://github.com/techgaun/github-dorks/blob/master/github-dorks.txt)
- Analyzing the Web Application
	- run burp/zap spider if app is small
	- use it as end user and get a feel of the target
	- Make a note of GET and POST parameters and look for anyinteresting ones.
	- Tinker with HTTP headers, such as the Referer, User-Agent,Host and X-Forwarded-For, and look how the application responds.
	- how are they handling sessions.(jwt or cookies etc.)
	- map attacking surface(jasons new talk will help)


## Exploitation Phase
- **Easy Wins**
	- Subdomain Takeover
		- subdomains -> subject [everyday check is better]
		- dig [potential-subdomain-takeover]
		- [can-i-takeover-xyz](https://github.com/EdOverflow/can-i-take-over-xyz)  [can-i-takeover-dns](https://github.com/indianajson/can-i-take-over-dns)
	- Misconfigured Cloud Storage Buckets
		- aws s3 [s3brute](https://github.com/ghostlulzhacks/s3brute) [another](https://github.com/jordanpotti/AWSBucketDump) 
		- google cloud [GCPBucketBrute](https://github.com/RhinoSecurityLabs/GCPBucketBrute)
		- Digital Ocean Spaces [spaces finder](https://github.com/appsecco/spaces-finder)
		- Azure blob
	- shodan [dorks](https://github.com/jakejarvis/awesome-shodan-queries)
	- Elasticsearch DB (look for port 9200) shodan ftw
	- Exposed Docker api (port 2375) shodan ftw
	- Kubernetes api (10250)
	- .git/.svn -> dumper/svn-extractor
- **CMS Exploitation**
	- wordpress -> [wpscan](https://github.com/wpscanteam/wpscan)
	- Joomla -> [joomscan](https://github.com/rezasp/joomscan)
	- Drupal -> [droopescan](https://github.com/droope/droopescan)
	- Adobe AEM -> [aem-hacker](Adobe AEM)
	- for other CMS search on [exploit-db](https://www.exploit-db.com/) + googling
- **Exploitation OWASP**
	- zseano is KING

Response manipulation:  
• isAdmin: false  
• Roles  
• Prices  
• Authentication bypass – isAuthenticated: false → true  
• Or you can also try a generic false to true in the response body

## Automate with monitoring
https://medium.com/@trapp3rhat/bug-hunting-methodology-part-1-91295b2d2066
https://m0chan.github.io/2019/12/17/Bug-Bounty-Cheetsheet.html

look into 
- MattiBijnens
- https://twitter.com/YnoofAssiri
- https://twitter.com/isira_adithya https://blog.isiraadithya.com/
- https://twitter.com/0xH4rmony
- https://twitter.com/leo__rac
- https://hx01.me/ Nice blog and data law exploitation in eu
- https://www.geekboy.ninja/blog/
- https://shubs.io/
- https://m0chan.github.io/
- https://galnagli.com/blog/

## Small Scope Domain
> i.e app.redacted.com
	[FavFreak](https://github.com/devanshbatham/FavFreak)   
- without session or login
		  		
	- https://github.com/nullt3r/jfscan
		- Nmap
		- https://infosecwriteups.com/why-you-should-always-scan-udp-ports-part-1-2-d8ee7eb26727
		- [Nabbu](https://github.com/projectdiscovery/naabu)

	- **Domain-Specific GitHub & Google Dorking**
		- wordlist [gist](https://gist.githubusercontent.com/EdOverflow/8bd2faad513626c413b8fc6e9d955669/raw/06a0ef0fd83920d513c65767aae258ecf8382bdf/gistfile1.txt)
		- [git-hound](https://github.com/tillson/git-hound)
		- git-all-secrets
		- trello, gitter.io and other platforms(stackoverflow)
		- https://github.com/gwen001
		- github-subdomains
		- github-endpoints
	- **Data Breach Analysis**
		- [Intelx](https://intelx.io/)
		- Hacking Forums
		- Darknet/Darkweb Analysis
	- **Misconfigured Cloud Storage**
https://infosecwriteups.com/how-i-got-5500-from-yahoo-for-rce-92fffb7145e6

https://github.com/six2dez/roboxtractor run on all waybact robots instance and get words


## dealing with subdomains

### subdomain takeover
- [can-i-takeover-xyz](https://github.com/EdOverflow/can-i-take-over-xyz)
- how to automate [blog](https://hakluke.medium.com/how-to-setup-an-automated-sub-domain-takeover-scanner-for-all-bug-bounty-programs-in-5-minutes-3562eb621db3)
- [dnstake](https://github.com/pwnesia/dnstake) [subjake](https://github.com/haccer/subjack)
- great guide [0xpratik](https://0xpatrik.com/)

### template based scanning
> will mostly be useful in targets running independent bug bounty program not on h1 etc.
- [Nuclei](https://github.com/projectdiscovery/nuclei)

### **Potential Pattern Extraction with GF**: 
 > Once you enumerate various URLs using waybackurls, gau, and other resources, you can use GF patterns to extract URLs that may be an interesting vector to check for specific attacks such as XSS, SSRF, SQLi, etc. You can further automate those URLs to perform automated detection of vulnerabilities while you work on them manually.
 
 - [gf-patterns](https://github.com/1ndianl33t/Gf-Patterns)
