---
title: STEM Hacking
layout: layouts/post
section: "odyssey"
category: "Security"
description: "A field guide to hacker-accessible STEM domains (electronics, biohacking, radio, energy, aerospace) with tools, projects, and starter resources for each."
tags: ["tech", "engineering", "hobby"]
published: 2025-07-27
lastUpdated: 2025-07-27
---

## 🛠️ Core Hacker Domains (with license info where applicable)

### 1. **Electronics & Embedded Systems**

- **Focus**: Microcontrollers, FPGAs, sensors, IoT devices

- **License**: None

- **Affordable tools**:

    - Arduino Uno/Nano (~€20)

    - ESP32 boards (~€8)

    - ATTiny Digispark (~€4) ([Instructables](https://www.instructables.com/HackerBoxes-Starter-Workshop/ "HackerBoxes Starter Workshop : 22 Steps - Instructables"), [Hackaday](https://hackaday.io/list/170538-projects-for-kids-stem-education "Projects for Kids (STEM Education) | Hackaday.io"))

- **Projects**:

    - Sensor-driven robotics, home automation, mesh communication

    - Wi-Fi/Bluetooth sniffers, protocol reversers using `hcxdumptool`

- **Resources**:

    - Hackaday.io, HackRVA resources ([wiki.hackrva.org](https://wiki.hackrva.org/index.php/Hacker_Resources "Hacker Resources - HackRVA"))

    - SparkFun tutorials, Hackster.io ([BostonTechMom](https://www.bostontechmom.com/resource-guide-to-diy-stem-projects-for-teens/ "Resource Guide to DIY STEM Projects for Teens | BostonTechMom"))

---

### 2. **Open Science Hardware & DIY Electronics**

- **Focus**: Tools you build yourself for science

- **License**: None

- **Affordable kits/projects**:

    - OpenPCR and CheapStat potentiostat (~$100) ([wiki.p2pfoundation.net](https://wiki.p2pfoundation.net/Product_Hacking "Product Hacking - P2P Foundation"))

    - Smartphone spectroscopy and light-wave comms kits (~$20–50) ([arXiv](https://arxiv.org/abs/2203.12015 "Modern Physics demonstrations with DIY Smartphone Spectrometers"))

- **Projects**:

    - DIY spectrometers using CD diffraction

    - Tricorder-style sensor wristbands, geiger counters

- **Resources**:

    - HackRVA's hardware list, Maker Faire tool kits

---

### 3. **Biohacking & DIY Biology**

- **Focus**: Genetic engineering, biosensors, bio-lab automation

- **License**: Sometimes required for pathogens or CRISPR

- **Organizations**:

    - DIYbio.org, La Paillasse, BioCurious, Genspace ([arXiv](https://arxiv.org/abs/2203.12015 "Modern Physics demonstrations with DIY Smartphone Spectrometers"), [wiki.p2pfoundation.net](https://wiki.p2pfoundation.net/Product_Hacking "Product Hacking - P2P Foundation"), [Wikipedia](https://en.wikipedia.org/wiki/Genspace "Genspace"), [WIRED](https://www.wired.com/2012/07/the-journal-of-peer-production-issue-2-biohardware-hacking "The Journal of Peer Production, issue #2 Bio/Hardware Hacking"), [Wikipedia](https://en.wikipedia.org/wiki/RaumZeitLabor "RaumZeitLabor"))

- **Projects**:

    - CRISPR kits to modify yeast or bacteria

    - Homebrew centrifuge, PCR machines

- **Resources**:

    - BioHack Academy, Hackteria wiki projects ([hackteria.org](https://hackteria.org/wiki/Collection_of_DIY_Biology%2C_Open_Source_Art_Projects "Collection of DIY Biology, Open Source Art Projects - Hackteria Wiki"))

---

### 4. **Radio & RF Hacking**

- **Focus**: SDR, amateur radio, protocol reverse engineering

- **License**: Receiving is free; transmitting needs license (HAM or local rules)

- **Affordable hardware**:

    - RTL‑SDR (~€30)

    - Yard Stick One (~€120) for sub‑GHz injection

    - RFQuack platform combining multiple RF dongles ([Wikipedia](https://en.wikipedia.org/wiki/List_of_open-source_hardware_projects "List of open-source hardware projects"), [arXiv](https://arxiv.org/abs/2104.02551 "RFQuack: A Universal Hardware-Software Toolkit for Wireless Protocol (Security) Analysis and Research"))

- **Projects**:

    - Record and replay car key fobs, thermostats, TPMS

    - Decode ADS‑B, NOAA, IoT sensors

    - Build custom LoRa or Bluetooth mesh device

- **Resources**:

    - URH, GQRX, RFQuack community tools

    - CHART radio telescope detecting 21 cm HI line ([arXiv](https://arxiv.org/abs/2307.11173 "The Completely Hackable Amateur Radio Telescope (CHART) Project"))

---

### 5. **Photonics, Light Sensing, and Optics**

- **Focus**: Free-space optical comms, spectroscopy, Li-Fi

- **License**: Not usually required

- **Affordable tools**:

    - Laser diodes, photodiodes, diffraction gratings

    - Smartphone spectrometer (~€10) ([arXiv](https://arxiv.org/abs/2007.09891 "A Do-It-Yourself (DIY) Light-Wave Sensing and Communication Project: Low-Cost, Portable, Effective, and Fun"), [arXiv](https://arxiv.org/abs/2203.12015 "Modern Physics demonstrations with DIY Smartphone Spectrometers"))

- **Projects**:

    - Li-Fi data link between LEDs and photo sensors

    - Building a home spectrometer for visible & near-UV

- **Resources**:

    - University optics courses, Instructables optics projects

---

### 6. **Energy Systems & High Voltage Exploration**

- **Focus**: Tesla coils, railguns, power electronics, solar/renewables

- **License**: None, but safe handling required

- **Affordable hardware**:

    - Flyback transformers, capacitors, MOSFETs

    - Recycled Li-ion batteries, solar panels

- **Projects**:

    - Build Tesla coil / plasma music device

    - Solar MPPT charger using ESP32 or Arduino

    - DIY battery management system

- **Resources**:

    - Maker forums, YouTube builds, power electronics textbooks

---

### 7. **Aerospace, Balloons & Near-Space Missions**

- **Focus**: High-altitude balloons, amateur satellites, tracking ground stations

- **License**: Required for >25 km or national airspace

- **Affordable tools**:

    - Mini weather balloons, LoRa trackers, SD cards, sensors

    - RTL‑SDR + tracking scripts

- **Projects**:

    - Send imaging payloads to ~30 km altitude

    - Build DIY ground station for satellite reception and telemetry

- **Resources**:

    - DIY balloon mission guides, Hackerspace RAumZeitLabor projects ([arXiv](https://arxiv.org/abs/2203.12015 "Modern Physics demonstrations with DIY Smartphone Spectrometers"), [WIRED](https://www.wired.com/2009/03/hackerspaces "DIY Freaks Flock to 'Hacker Spaces' Worldwide"), [Wikipedia](https://en.wikipedia.org/wiki/RaumZeitLabor "RaumZeitLabor"))

---

### 8. **Machine Tools, CNC & Fabrication**

- **Focus**: Digital manufacturing, custom hardware building

- **License**: None

- **Affordable hardware**:

    - Open-source CNC routers (Good Enough CNC, Maslow CNC) ([wiki.p2pfoundation.net](https://wiki.p2pfoundation.net/Product_Hacking "Product Hacking - P2P Foundation"))

    - 3D printers (RepRap, LulzBot)

- **Projects**:

    - Fabricate custom enclosures or antenna mounts

    - Build cabinetry or metal parts using CNC

    - Combine electronics and mechanical systems

- **Resources**:

    - Thingiverse for CAD models, Hackster.io workstation builds

---

### 9. **Neuro Hacking & Biometric Systems**

- **Focus**: EEG/EMG-based human-computer interaction, wearable sensors

- **License**: Possibly regulated for medical use

- **Affordable hardware**:

    - OpenBCI kits (<€200)

    - DIY gel electrodes, EDU kits

- **Projects**:

    - Simple BCI that controls devices

    - Wearables to log heart rate, muscle activation

- **Resources**:

    - OpenBCI tutorials, Backyard Brains SpikerBox ([Wikipedia](https://en.wikipedia.org/wiki/List_of_open-source_hardware_projects "List of open-source hardware projects"), [wiki.p2pfoundation.net](https://wiki.p2pfoundation.net/Product_Hacking "Product Hacking - P2P Foundation"), [hackteria.org](https://hackteria.org/wiki/Collection_of_DIY_Biology%2C_Open_Source_Art_Projects "Collection of DIY Biology, Open Source Art Projects - Hackteria Wiki"))

---

## 🏁 Putting It All Together: The Hacker STEM Ecosystem

|Domain|Example Project|Toolkits / Kits|Cost Estimate|
|---|---|---|---|
|Embedded Systems|Custom LoRa mesh communicator|ESP32 Dev Kits|€8–20|
|Open Hardware Lab Tools|DIY potentiostat, PCR|CheapStat, OpenPCR|€50–100|
|Bio Lab|CRISPR yeast experiment|DIYbio starter kits|€200+|
|RF / SDR|ADS‑B plane tracker|RTL‑SDR + antenna|€30–60|
|Optics / Li-Fi|Visible light wireless link|LEDs + photodiode|€10–30|
|Energy / HV|Tesla coil / Solar tracker|HV kit, Li-ion modules|€50–150|
|Aero Missions|Stratospheric balloon payload (imaging)|Balloon kit + sensors|€100–300|
|Fabrication|CNC router to build antenna structures|Open CNC kit|€300–500|
|Neuro Wearables|EEG BCI control interface|OpenBCI or SpikerBox|€150–250|

---

## 🌱 Starter Paths by Budget

### Under €100:

- ESP32 + sensors projects

- RTL‑SDR projects (ADS‑B, car remotes)

- DIY spectrometer with smartphone

- Li‑Fi communication LED link

- OpenBCI or SpikerBox for simple EEG sensing

### €100–300:

- CheapStat/OpenPCR experiments

- High-altitude balloon missions

- CRISPR yeast kits

- Basic CNC router building

- Affordable Tesla coil

### €300–600:

- Fully integrated multi-domain lab: CNC + SDR + bio kits

- Advanced ground station for CubeSat reception

- Fabricated dirigible drone, custom antenna arrays

---

## 📚 Learning Resources & Community Hubs

- **HackerSpaces.org**, Noisebridge, RaumZeitLabor for shared tools and mentorship ([Instructables](https://www.instructables.com/HackerBoxes-Starter-Workshop/ "HackerBoxes Starter Workshop : 22 Steps - Instructables"), [Wikipedia](https://en.wikipedia.org/wiki/Hackteria "Hackteria"), [wiki.p2pfoundation.net](https://wiki.p2pfoundation.net/Product_Hacking "Product Hacking - P2P Foundation"), [hackteria.org](https://hackteria.org/wiki/Collection_of_DIY_Biology%2C_Open_Source_Art_Projects "Collection of DIY Biology, Open Source Art Projects - Hackteria Wiki"), [Wikipedia](https://en.wikipedia.org/wiki/DIYbio_%28organization%29 "DIYbio (organization)"), [arXiv](https://arxiv.org/abs/2104.02551 "RFQuack: A Universal Hardware-Software Toolkit for Wireless Protocol (Security) Analysis and Research"), [wiki.hackrva.org](https://wiki.hackrva.org/index.php/Hacker_Resources "Hacker Resources - HackRVA"), [WIRED](https://www.wired.com/2009/03/hackerspaces "DIY Freaks Flock to 'Hacker Spaces' Worldwide"), [Wikipedia](https://en.wikipedia.org/wiki/RaumZeitLabor "RaumZeitLabor"), [Wikipedia](https://en.wikipedia.org/wiki/Genspace "Genspace"), [arXiv](https://arxiv.org/abs/2203.12015 "Modern Physics demonstrations with DIY Smartphone Spectrometers"))

- **HackRVA**, **Make Magazine**, **Hackster.io**, **Hackaday.io** for tutorials & project inspiration ([wiki.hackrva.org](https://wiki.hackrva.org/index.php/Hacker_Resources "Hacker Resources - HackRVA"))

- **Wiki.p2pfoundation.net** for open-hardware and CNC resources ([wiki.p2pfoundation.net](https://wiki.p2pfoundation.net/Product_Hacking "Product Hacking - P2P Foundation"))

- **DIYbio.org**, Genspace, Hackteria communities for biohack collaboration ([Wikipedia](https://en.wikipedia.org/wiki/DIYbio_%28organization%29 "DIYbio (organization)"))

---

## 🧭 Final Guidance

- Begin with **one domain** (e.g., SDR + embedded systems), then gradually branch into optics, bio, aerospace, etc.

- Join a **local hackerspace or makerspace**: they often offer tools, safety oversight, and community support.

- Track progress via a **notebook and checklist**, from building a spectrometer to running a lab-grade electrochemical test.

- Seek **small grants** or second-hand lab gear: bioscience labs often donate outdated equipment.

---

| #   | Domain                     | Hacker Potential ⚡ | DIY Friendliness 🛠 | Starter Resource(s) 📚                                  |
| --- | -------------------------- | ------------------ | ------------------- | ------------------------------------------------------- |
| 1   | Electronics                | ★★★★★              | ★★★★★               | _Make: Electronics_, Arduino Starter Kit                |
| 2   | Embedded Systems           | ★★★★★              | ★★★★★               | ESP32, RP2040, PlatformIO                               |
| 3   | RF & SDR                   | ★★★★★              | ★★★★☆               | RTL-SDR, _Hobbyist's Guide to RTL-SDR_                  |
| 4   | Radio Astronomy            | ★★★★☆              | ★★★★☆               | RTL-SDR + dish, NOAA/GOES guides                        |
| 5   | Optics & Spectroscopy      | ★★★★☆              | ★★★★☆               | DIY spectrometer, _Introduction to Optics_              |
| 6   | Electromagnetic Waves      | ★★★★☆              | ★★★★☆               | SDR tools, Antenna theory (Balanis)                     |
| 7   | Signal Processing          | ★★★★☆              | ★★★★☆               | _Think DSP_ by Allen Downey, GNU Radio                  |
| 8   | Control Systems            | ★★★★☆              | ★★★☆☆               | Arduino + PID tuning, _Feedback Systems_ (Åström)       |
| 9   | Mechatronics               | ★★★★☆              | ★★★★☆               | Arduino + motors, _Robot Builder's Bonanza_             |
| 10  | Robotics                   | ★★★★☆              | ★★★★☆               | OpenCV, ROS2, _Learning ROS for Robotics Programming_   |
| 11  | Biohacking                 | ★★★★☆              | ★★★☆☆               | _BioBuilder_, OpenPCR kit                               |
| 12  | Chemistry Hacking          | ★★★☆☆              | ★★★★☆               | _Home Chemistry_ by R.B. Thompson                       |
| 13  | High Voltage / Tesla Coils | ★★★★☆              | ★★★☆☆               | Flyback transformers, _Tesla Coil Design Manual_        |
| 14  | Satellite Comms (APT/HRPT) | ★★★★☆              | ★★★☆☆               | RTL-SDR + NOAA APT kit                                  |
| 15  | GNSS & GPS Hacking         | ★★★☆☆              | ★★★★☆               | Ublox NEO-6M, GPS-SDR-SIM                               |
| 16  | Radiation Detection        | ★★★★☆              | ★★★★☆               | SBM-20 Geiger tubes, Arduino counters                   |
| 17  | Quantum Computing          | ★★☆☆☆              | ★★☆☆☆               | IBM Qiskit simulator, _Quantum Computation & Info_      |
| 18  | Cryptography               | ★★★☆☆              | ★★★★★               | _The Code Book_, Cryptopals Challenges                  |
| 19  | Reverse Engineering        | ★★★★★              | ★★★★☆               | Ghidra, Radare2, _Practical Reverse Engineering_        |
| 20  | PCB Design                 | ★★★★☆              | ★★★★☆               | KiCAD, _Make Your Own PCBs with KiCAD_                  |
| 21  | VLSI / Chip Design         | ★★☆☆☆              | ★★☆☆☆               | OpenLane, Skywater PDK, _Digital Design_ by Morris Mano |
| 22  | Computer Architecture      | ★★★☆☆              | ★★★★☆               | nand2tetris, RISC-V boards                              |
| 23  | Operating Systems          | ★★★★☆              | ★★★☆☆               | _Operating Systems: Three Easy Pieces_, xv6             |
| 24  | Compilers                  | ★★★☆☆              | ★★★★☆               | _Crafting Interpreters_, _Let's Build a Compiler_       |
| 25  | IoT & Home Automation      | ★★★★☆              | ★★★★★               | ESPHome, Tasmota, Home Assistant                        |
| 26  | TinyML / Embedded AI       | ★★★★☆              | ★★★★☆               | ESP32-S3, _TinyML_ by Pete Warden                       |
| 27  | Machine Learning           | ★★★☆☆              | ★★★☆☆               | _Hands-On ML_ by Aurélien Géron                         |
| 28  | Data Science               | ★★★☆☆              | ★★★☆☆               | _Python for Data Analysis_, Jupyter                     |
| 29  | Computer Vision            | ★★★★☆              | ★★★☆☆               | OpenCV + webcam, PyTorch                                |
| 30  | Neuroscience               | ★★☆☆☆              | ★☆☆☆☆               | _Principles of Neural Science_, EEG headbands           |
| 31  | Brain-Computer Interfaces  | ★★★☆☆              | ★★☆☆☆               | OpenBCI, Emotiv Insight                                 |
| 32  | Cybersecurity              | ★★★★☆              | ★★★★★               | HackTheBox, _The Web Application Hacker’s Handbook_     |
| 33  | Wireless Sensor Networks   | ★★★☆☆              | ★★★★☆               | LoRa, ESP-NOW, Zigbee kits                              |
| 34  | Acoustic Engineering       | ★★★☆☆              | ★★★☆☆               | Audio analyzers, ultrasonic sensors                     |
| 35  | Thermodynamics             | ★★★☆☆              | ★★☆☆☆               | _How Everything Works_, Steam kits                      |
| 36  | Fluid Dynamics             | ★★★☆☆              | ★★☆☆☆               | CFD simulations, wind tunnels                           |
| 37  | Aero Engineering           | ★★★☆☆              | ★★☆☆☆               | RC planes, flight simulators                            |
| 38  | Automotive Hacking         | ★★★★☆              | ★★★☆☆               | OBD2 + CAN tools, _The Car Hacker’s Handbook_            |
| 39  | Satellite Engineering      | ★★☆☆☆              | ★☆☆☆☆               | Cubesat kits, _DIY Satellite Platforms_                 |
| 40  | Wearables                  | ★★★☆☆              | ★★★★☆               | LilyPad Arduino, ESP32 BLE                               |
| 41  | Augmented Reality          | ★★★☆☆              | ★★★☆☆               | AR.js, OpenCV                                            |
| 42  | Simulation & Modeling      | ★★★☆☆              | ★★★★☆               | Simulink, Python, COMSOL (Lite)                          |
| 43  | Environmental Sensing      | ★★★☆☆              | ★★★★☆               | CO2, PM2.5, VOC sensors                                  |
| 44  | Renewable Energy           | ★★★☆☆              | ★★★★☆               | DIY solar panel kits, wind generator kits                |
| 45  | Energy Storage             | ★★☆☆☆              | ★★★☆☆               | Battery management systems                               |
| 46  | Materials Science          | ★★☆☆☆              | ★★☆☆☆               | DIY crystal growth, tensile testing                      |
| 47  | Nanotech                   | ★☆☆☆☆              | ★☆☆☆☆               | Educational microscope kits                              |
| 48  | Spectral Imaging           | ★★★☆☆              | ★★☆☆☆               | DIY multispectral cameras                                |
| 49  | Smart Materials            | ★★☆☆☆              | ★★☆☆☆               | Shape memory alloys, e-ink displays                      |
| 50  | Structural Engineering     | ★★☆☆☆              | ★★☆☆☆               | Finite Element Analysis (FreeCAD FEM)                    |
| 51  | Seismology                 | ★★☆☆☆              | ★★☆☆☆               | DIY seismograph with geophones                           |
| 52  | Ocean Engineering          | ★☆☆☆☆              | ★☆☆☆☆               | ROV kits, _OpenROV_ projects                             |
| 53  | Topology & Knot Theory     | ★★☆☆☆              | ★★☆☆☆               | _The Knot Book_, 3D-printed topologies                   |
| 54  | Chaos Theory               | ★★☆☆☆              | ★★★☆☆               | Double pendulum builds, logistic map sims                |
| 55  | Game Theory                | ★★☆☆☆              | ★★★☆☆               | Python simulations, _The Art of Strategy_                |
| 56  | Quantum Sensors            | ★☆☆☆☆              | ★☆☆☆☆               | NV center kits (cutting edge, expensive)                 |
| 57  | Smart Agriculture          | ★★★☆☆              | ★★★★☆               | Soil moisture, LoRaWAN farm sensors                      |
| 58  | Digital Twins              | ★★☆☆☆              | ★★☆☆☆               | Unreal Engine, Unity Physics                             |
| 59  | Photonics                  | ★★☆☆☆              | ★★☆☆☆               | Optical fiber demos, laser modulation                    |
| 60  | Spintronics                | ★☆☆☆☆              | ★☆☆☆☆               | Research papers, few DIY kits yet                        |
