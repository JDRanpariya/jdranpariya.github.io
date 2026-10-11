---
layout: public.njk
permalink: /reinforcement-learning/index.html
title: RL · Jay Ranpariya
description: My reinforcement learning interests and review-paper reading list.
canonical: https://research.jdranpariya.com/reinforcement-learning/
pageKind: rl
status: published
lastUpdated: 2026-10-12
---

# Reinforcement learning interests

## Start here

- [Deep Reinforcement Learning for Robotics: A Survey of Real-World Successes](https://arxiv.org/abs/2408.03539), Chen Tang et al., 2025, Annual Review of Control, Robotics, and Autonomous Systems.
- [Taxonomy and Trends in Reinforcement Learning for Robotics and Control Systems: A Structured Review](https://arxiv.org/abs/2510.21758), Kumater Ter et al., 2025, arXiv preprint.
- [Challenges of real-world reinforcement learning: definitions, benchmarks and analysis](https://doi.org/10.1007/s10994-021-05961-4), Gabriel Dulac-Arnold et al., 2021, Machine Learning.
- [How to Train Your Robot with Deep Reinforcement Learning: Lessons We've Learned](https://arxiv.org/abs/2102.02915), Julian Ibarz et al., 2021, International Journal of Robotics Research.
- [A Tour of Reinforcement Learning: The View from Continuous Control](https://arxiv.org/abs/1806.09460), Benjamin Recht, 2018, arXiv preprint.
- [The Alberta Plan for AI Research](https://arxiv.org/abs/2208.11173), Richard S. Sutton et al., 2022, arXiv preprint.

## Safety and trust

### Safe RL and constrained MDPs

- [A Survey of Safe Reinforcement Learning and Constrained MDPs: A Technical Survey on Single-Agent and Multi-Agent Safety](https://arxiv.org/abs/2505.17342), Ankita Kushwaha et al., 2025, arXiv preprint.
- [A Review of Safe Reinforcement Learning: Methods, Theories, and Applications](https://arxiv.org/abs/2205.10330), Shangding Gu et al., 2024, IEEE Transactions on Pattern Analysis and Machine Intelligence.
- [A Survey of Constraint Formulations in Safe Reinforcement Learning](https://arxiv.org/abs/2402.02025), Akifumi Wachi et al., 2024, IJCAI 2024 (Survey Track).
- [SafeMPO: Constrained Reinforcement Learning with Probabilistic Incremental Improvement](https://proceedings.iclr.cc/paper_files/paper/2026/file/1fa0c4e5a7e189729230d018b229abc7-Paper-Conference.pdf), Alexander Mattick et al., 2026, ICLR 2026.
- [Constrained Reinforcement Learning Using Successor Representations](https://openreview.net/forum?id=6zUq7knzwA), Michael Girstl et al., 2026, Transactions on Machine Learning Research.
- [ActSafe: Active Exploration with Safety Constraints for Reinforcement Learning](https://arxiv.org/abs/2410.09486), Yarden As et al., 2024, arXiv preprint.

### Safety filters and certificates

- [A Review On Safe Reinforcement Learning Using Lyapunov and Barrier Functions](https://arxiv.org/abs/2508.09128), Dhruv Singh Kushwaha et al., 2025, Artificial Intelligence Review (2026).
- [The Safety Filter: A Unified View of Safety-Critical Control in Autonomous Systems](https://arxiv.org/abs/2309.05837), Kai-Chieh Hsu et al., 2024, Annual Review of Control, Robotics, and Autonomous Systems 7.
- [Safe Learning in Robotics: From Learning-Based Control to Safe Reinforcement Learning](https://arxiv.org/abs/2108.06266), Lukas Brunke et al., 2022, Annual Review of Control, Robotics, and Autonomous Systems 5.

### Verification

- [A Survey on the Verification of Reinforcement Learning Policies](https://arxiv.org/abs/2607.16210), Luca Marzari et al., 2026, IJCAI 2026 (Survey Track).
- [Formal Methods in Robot Policy Learning and Verification: A Survey on Current Techniques and Future Directions](https://arxiv.org/abs/2602.06971), Anastasios Manganaris et al., 2026, Transactions on Machine Learning Research.
- [Provably Safe Reinforcement Learning: Conceptual Analysis, Survey, and Benchmarking](https://arxiv.org/abs/2205.06750), Hanna Krasowski et al., 2023, Transactions on Machine Learning Research.

### Explainability and interpretability

- [A Survey of Explainable Reinforcement Learning: Targets, Methods and Needs](https://arxiv.org/abs/2507.12599), Léo Saulières, 2025, arXiv preprint.
- [Explainable Reinforcement Learning: A Survey and Comparative Review](https://doi.org/10.1145/3616864), Stephanie Milani et al., 2024, ACM Computing Surveys (arXiv 2202.08434).
- [A Survey on Interpretable Reinforcement Learning](https://doi.org/10.1007/s10994-024-06543-w), Claire Glanois et al., 2024, Machine Learning (arXiv 2112.13112).
- [SINDy-RL: Interpretable and Efficient Model-Based Reinforcement Learning](https://arxiv.org/abs/2403.09110), Nicholas Zolman et al., 2024, Nature Communications (2025).

## Learning on real systems

### Sample efficiency and priors

- [Embedding Physics Priors in Robot Learning: A Survey](https://arxiv.org/abs/2609.22319), Mattia Piccinini et al., 2026, arXiv preprint.
- [Reinforcement Learning in the Real World: A Survey of Statistical Challenges and Future Directions](https://arxiv.org/abs/2601.15353), Asim H. Gazi et al., 2026, arXiv preprint.
- [Guided Reinforcement Learning: A Review and Evaluation for Efficient and Effective Real-World Robotics](https://doi.org/10.1109/mra.2022.3207664), Julian Eßer et al., 2023, IEEE Robotics & Automation Magazine.
- [SERL: A Software Suite for Sample-Efficient Robotic Reinforcement Learning](https://arxiv.org/abs/2401.16013), Jianlan Luo et al., 2024, ICRA 2024.
- [A Walk in the Park: Learning to Walk in 20 Minutes With Model-Free Reinforcement Learning](https://arxiv.org/abs/2208.07860), Laura Smith et al., 2022, arXiv preprint.

### Sim-to-real and system identification

- [The Reality Gap in Robotics: Challenges, Solutions, and Best Practices](https://arxiv.org/abs/2510.20808), Elie Aljalbout et al., 2025, Annual Review of Control, Robotics, and Autonomous Systems.
- [Robot Model Identification and Learning: A Modern Perspective](https://doi.org/10.1146/annurev-control-061523-102310), Lee et al., 2024, Annual Review of Control, Robotics, and Autonomous Systems.
- [A Review of Differentiable Simulators](https://arxiv.org/abs/2407.05560), Rhys Newbury et al., 2024, IEEE Access.
- [SPiDR: A Simple Approach for Zero-Shot Safety in Sim-to-Real Transfer](https://arxiv.org/abs/2509.18648), Yarden As et al., 2025, arXiv preprint.

### World models and model-based RL

- [World Model for Robot Learning: A Comprehensive Survey](https://arxiv.org/abs/2605.00080), Bohan Hou et al., 2026, International Journal of Robotics Research.
- [A Comprehensive Survey on World Models for Embodied AI](https://arxiv.org/abs/2510.16732), Xinqing Li et al., 2025, arXiv preprint.
- [Model-based Reinforcement Learning: A Survey](https://arxiv.org/abs/2006.16712), Thomas M. Moerland et al., 2020, Foundations and Trends in Machine Learning (arXiv 2020).
- [Stealing That Free Lunch: Exposing the Limits of Dyna-Style Reinforcement Learning](https://arxiv.org/abs/2412.14312), Brett Barkley et al., 2024, ICML 2025.
- [What Should World Models Forget? Stratified Retention for Continual Adaptation](https://arxiv.org/abs/2610.03713), Nishit Anand et al., 2026, NeurIPS 2026 Continual World Models Workshop.

### Real-time learning, delays and partial observability

- [Reinforcement Learning for Control Systems with Time Delays: A Comprehensive Survey](https://arxiv.org/abs/2602.00399), Armando Alves Neto, 2026, arXiv preprint.
- [Partially Observable Markov Decision Processes in Robotics: A Survey](https://arxiv.org/abs/2209.10342), Mikko Lauri et al., 2022, IEEE Transactions on Robotics.
- [Real-Time Reinforcement Learning](https://arxiv.org/abs/1911.04448), Simon Ramstedt et al., 2019, NeurIPS 2019.
- [Streaming Deep Reinforcement Learning Finally Works](https://arxiv.org/abs/2410.14606), Mohamed Elsayed et al., 2024, arXiv preprint.

## Continual adaptation

### Continual RL

- [A Survey of Continual Reinforcement Learning](https://arxiv.org/abs/2506.21872), Chaofan Pan et al., 2025, arXiv preprint.
- [Advancements and Challenges in Continual Reinforcement Learning: A Comprehensive Review](https://arxiv.org/abs/2506.21899), Amara Zuffer et al., 2025, arXiv preprint.
- [Towards Continual Reinforcement Learning: A Review and Perspectives](https://arxiv.org/abs/2012.13490), Khimya Khetarpal et al., 2022, Journal of Artificial Intelligence Research (arXiv 2020).
- [Position: Lifetime tuning is incompatible with continual reinforcement learning](https://arxiv.org/abs/2404.02113), Golnaz Mesbahi et al., 2024, ICML 2025 (position track).
- [Continual Learning as Computationally Constrained Reinforcement Learning](https://arxiv.org/abs/2307.04345), Saurabh Kumar et al., 2023, arXiv preprint.
- [Research plan: Continual robot learning solely using onboard computers](https://drive.google.com/file/d/1Y7VoWPazBIO3HHndKtxeNZJRP5BqEN9R/view), A. Rupam Mahmood, 2026, CCAI renewal proposal (shared on Drive).

### Plasticity and distribution shift

- [Plasticity Loss in Deep Reinforcement Learning: A Survey](https://arxiv.org/abs/2411.04832), Timo Klein et al., 2024, arXiv preprint.
- [A Unified Causal-Origin Taxonomy of Distributional Shifts in Reinforcement Learning](https://arxiv.org/abs/2606.16933), Ardianto Wibowo et al., 2026, arXiv preprint.
- [Loss of plasticity in deep continual learning](https://doi.org/10.1038/s41586-024-07711-7), Shibhansh Dohare et al., 2024, Nature.
- [Plasticity as the Mirror of Empowerment](https://arxiv.org/abs/2505.10361), David Abel et al., 2025, NeurIPS 2025.

## Temporal abstraction and credit assignment

### Hierarchical RL and skills

- [Discovering Temporal Structure: An Overview of Hierarchical Reinforcement Learning](https://arxiv.org/abs/2506.14045), Martin Klissarov et al., 2025, arXiv preprint.
- [Hierarchical Reinforcement Learning: A Comprehensive Survey](https://doi.org/10.1145/3453160), Shubham Pateria et al., 2021, ACM Computing Surveys.

### Credit assignment

- [A Survey of Temporal Credit Assignment in Deep Reinforcement Learning](https://arxiv.org/abs/2312.01072), Eduardo Pignatelli et al., 2024, Transactions on Machine Learning Research (arXiv Dec 2023).

## Interesting reads

- [Settling the Reward Hypothesis](https://arxiv.org/abs/2212.10420), Michael Bowling et al., 2022, arXiv preprint.
- [Scalar reward is not enough: A response to Silver, Singh, Precup and Sutton (2021)](https://arxiv.org/abs/2112.15422), Peter Vamplew et al., 2021, arXiv preprint.
- [Does Zero-Shot Reinforcement Learning Exist?](https://arxiv.org/abs/2209.14935), Ahmed Touati et al., 2022, ICLR 2023.
- [Can We Really Learn One Representation to Optimize All Rewards?](https://arxiv.org/abs/2602.11399), Chongyi Zheng et al., 2026, arXiv preprint.
- [Discovering state-of-the-art reinforcement learning algorithms](https://doi.org/10.1038/s41586-025-09761-x), Junhyuk Oh et al., 2025, Nature.
- [Deep Reinforcement Learning at the Edge of the Statistical Precipice](https://arxiv.org/abs/2108.13264), Rishabh Agarwal et al., 2021, NeurIPS 2021.
- [Empirical Design in Reinforcement Learning](https://arxiv.org/abs/2304.01315), Andrew Patterson et al., 2023, Journal of Machine Learning Research (2024).
