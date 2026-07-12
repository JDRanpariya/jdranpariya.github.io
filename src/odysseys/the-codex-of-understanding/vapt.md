---
title: VAPT
layout: layouts/post
section: "odyssey"
category: "Security"
description: "A working methodology for vulnerability assessment and penetration testing: scope, phases, reporting, and a running list of study resources."
tags: ["security", "practical", "research"]
published: 2023-03-21
lastUpdated: 2026-07-12
---

Vulnerability Assessment and  Penetration Testing
- If it's for a web app you need to systematically work through the OWASP [WSTG](https://owasp.org/www-project-web-security-testing-guide/v42/) to make sure you don't miss anything.
- Use CVSS3.1 to calculate severity, it’s industry standard
- http://www.pentest-standard.org/index.php/Main_Page

## How to handle Network VAPT

1. Scope
	1. List of Network Devices Routers, Laptop, Desktop, Firewall, IDS, Access point, IPS
	2. Network Architecture Diagram
	3. Type of Testing:
		1. VA (with/without Credentials)
		2. VAPT
2. Kick-off Meeting with client
	1. Number of locations
	2. Number of VLAN's
	3. List of Public IP
	4. List of Internal IP
	5. VPN Access/Remote Desktop
		1. I5, 8g, SSD, Good Internet
3. Phase 1 Testing
	1. Testing Schedule
	2. Nessus, Nmap, Wireshark/Metasploit(PT)
	3. Report writing
4. Patching
5. Report Discussion
6. Retesting




Finish 
- [x] https://www.youtube.com/watch?v=B7tTQ272OHE
	- It was about simple N map scan followed by dir buster and then getting reverse outbound connection using Metasploit to get access. Later, he got root privilege and got shadow and passwd files then he tried cracking it using password crackers. 
- [x] https://www.youtube.com/watch?v=8a1yTN2kFNw
	- Six Step Process
		- Pre engagement
		- Recon
		- Vulnerability Assessment
		- Exploitation
		- Post Exploitation
		- Reporting
- [ ] https://www.youtube.com/watch?v=3Ab2EkY-smg
	- How to Handle VAPT project?
- [ ] https://www.youtube.com/watch?v=ix5dKdUpdVM
- [ ] https://www.youtube.com/watch?v=PaIYYjXBrJA
- [ ] https://www.youtube.com/watch?v=KhwzGlA6mtE
- [ ] https://www.youtube.com/playlist?list=PLg9GJR36BjdhEKp2ij9vYpvhJnfm-_U2N

https://tryhackme.com/hacktivities
https://academy.tcm-sec.com/courses

## Reverse Engineering

- https://yurichev.org/RE_start/
- [Reverse Engineering for Everyone](https://0xinfection.github.io/reversing/)
- [Binary Ninjas in Training](https://github.com/Vector35/binaryninja-api/wiki/Ninjas-In-Training)
- [GitHub Resources](https://github.com/ReversingID/Awesome-Reversing/tree/master)
- Goldbot.org
- [Getting Started with Reverse Engineering](https://www.youtube.com/watch?v=1MotMBPX7tY&t=17s&pp=ygUpZ2V0dGluZyBzdGFydGVkIHdpdGggcmV2ZXJzZSBlbmdpbmVlcmluZyA%3D)

## API Security

### Resources

- https://github.com/arainho/awesome-api-security

### Books

- Hacking APIs

## Broken Object Level Authorization

> also known as IDOR

Types of Access Control

- Role based
- Discretionary(Cloud Share)
- Attribute based(Rare in webapps)

- Mess with cookies
- Access something without login
- Access other users resources
- Admin function as regular user
