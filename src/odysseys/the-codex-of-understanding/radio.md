---
title: Radio
layout: layouts/post
section: "odyssey"
category: "Creative & Language"
description: "A self-directed curriculum for the electromagnetic spectrum: SDR, antennas, modulation, and radio hacking, from physics to hands-on practice."
tags: ["radio", "engineering", "hobby"]
published: 2025-07-27
lastUpdated: 2025-07-27
---

Here’s a **comprehensive engineering + hacker-oriented curriculum** to master the **electromagnetic spectrum, SDR, antennas, sensors, modulation, and access systems**, from physics to practice. This roadmap blends **university-level fundamentals**, **RF engineering**, and **practical SDR/radio hacking** skills.

---

## 🧠 Phase 0: Core Concepts You Must Understand

|Topic|Goal|
|---|---|
|Classical Electromagnetics|Understand how EM waves work (Maxwell, wave propagation, polarization)|
|Signals and Systems|Understand how information is encoded, transmitted, received|
|Electronics Basics|Learn circuits, impedance, resonance, and RF signal flow|
|Legal Frameworks|Know what’s legal to transmit or scan|

---

## 📘 Phase 1: Physics and Electrical Engineering Foundations (1–2 months)

### 🎯 Objective:

Build physical and mathematical intuition about how EM fields and signals behave.

### 🧱 Topics:

- Maxwell’s equations & wave propagation
- Electromagnetic spectrum overview
- Impedance, VSWR, transmission lines
- Resonance, filters, capacitors/inductors
- Decibel (dB), power levels (ERP, EIRP)

### 🛠 Resources:

- 📘 [MIT OCW Physics II: Electricity & Magnetism](https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/)
- 📘 _Fundamentals of Applied Electromagnetics_ by Fawwaz Ulaby
- 🛠 Use Falstad Circuit Simulator (online) or LTSpice for circuits
- 📘 _The Art of Electronics_ by Horowitz & Hill (ch. 1–4)

---

## 🔉 Phase 2: Signals, Modulation & DSP (2 months)

### 🎯 Objective:

Understand how signals are represented, modulated, and decoded.

### 📊 Topics:

- Time vs Frequency domain (Fourier transform)
- Amplitude/Phase/Frequency Modulation (AM/FM/PM)
- Digital modulation (ASK, FSK, PSK, QAM)
- Sampling theory, Nyquist, aliasing
- FIR/IIR filters, convolution

### 🛠 Resources:

- 📘 _Signals and Systems_ by Oppenheim & Willsky (classic)
- 📺 [Khan Academy or Neso Academy](https://youtube.com/playlist?list=PL3oQ6c1u1HTZgGvskPG5G94hHzcP8HExI)
- 📘 _Understanding Digital Signal Processing_ by Richard Lyons
- 🧪 Tools: Python (scipy.signal, matplotlib), Audacity, Inspectrum

---

## 📡 Phase 3: SDR & RF Hacking Foundations (2 months)

### 🎯 Objective:

Learn SDR software & hardware stack to capture, demodulate, analyze, and generate signals.

### ⚙️ Topics:

- What is SDR? How is it different from analog RF?
- SDR architecture: ADC, mixer, local oscillator, FPGA, USB interface
- Capture real signals with RTL-SDR, HackRF
- Reverse engineer RF protocols (garage doors, remote controls, etc.)
- Transmit (legally) using HackRF or LimeSDR

### 🛠 Tools & Resources:

- 📘 _Software Defined Radio: The SDR Handbook_ by Alexander M. Wyglinski
- 🖥️ GNU Radio (use [GNU Radio Companion](https://wiki.gnuradio.org/index.php/Main_Page))
- 📺 Michael Ossmann’s [SDR YouTube series](https://greatscottgadgets.com/sdr/)
- 🧪 Tools: GQRX, Universal Radio Hacker (URH), Inspectrum, Audacity
- 📦 RTL-SDR dongle, HackRF One, LimeSDR Mini

---

## 📡 Phase 4: Antennas, Propagation, and Transmission (2 months)

### 🎯 Objective:

Design, build, and analyze antennas. Understand how RF signals travel in real space.

### 📊 Topics:

- Antenna types: monopole, dipole, Yagi, helical, patch, log-periodic
- Gain, radiation patterns, beamwidth
- Impedance matching and VSWR
- Far-field vs near-field
- Free-space path loss, reflection, multi-path, fading

### 🛠 Resources:

- 📘 _Antenna Theory_ by Balanis (academic), or ARRL Antenna Handbook (practical)
- 🛠 Tools: 4NEC2 (antenna simulation), NanoVNA (hardware)
- Build antennas from wire, PCB, copper foil
- Projects: ¼ wave monopole, dipole, directional Wi-Fi antenna

---

## 📶 Phase 5: Protocols, Spectrum Use, and Reverse Engineering (2 months)

### 🎯 Objective:

Understand how real-world radio systems work and how to decode them.

### 🔐 Topics:

- ISM bands (433 MHz, 868 MHz, 915 MHz, 2.4 GHz)
- LoRa, Bluetooth, Zigbee, Wi-Fi, ADS-B, AIS
- Decoding FM radio, POCSAG pager signals, AM, TV
- GSM, LTE, TETRA, satellite signals (Iridium, GPS)
- Legal constraints, power levels (ERP, EIRP), FCC regulations

### 🛠 Tools:

- 📦 URH (Universal Radio Hacker) to reverse RF signals
- 📦 gr-gsm (GSM decoding)
- 📦 dump1090 (ADS-B aircraft tracking)
- 📦 gps-sdr-sim (simulate GPS)
- 🔎 FCC [Frequency Allocation Chart](https://www.ntia.gov/files/ntia/publications/january_2016_spectrum_wall_chart.pdf)

---

## 🛰️ Phase 6: Satellite Comms, GNSS, and Remote Sensing (2 months+)

### 🎯 Objective:

Access satellite signals, decode GNSS/GPS, and understand satellite spectrum design.

### 🛰️ Topics:

- LEO/MEO/GEO satellites
- GPS/GNSS signal structure (L1, L2 bands)
- Satellite phone frequencies (Iridium, Inmarsat)
- Weather satellites (NOAA, GOES) image decoding
- Amateur radio satellites (CubeSats, ISS repeaters)
- LNBs, downconverters, dish setup

### 🛠 Tools:

- 📘 _GNSS Software Receivers_ by Kai Borre
- 📺 [Satellite decoding with SDR](https://www.rtl-sdr.com/tag/weather-satellite/)
- 📦 gr-iridium, GNSS-SDR, SatDump
- Hardware: RTL-SDR, dish antenna, LNA + SAW filters

---

## 🛡️ Phase 7: Legal, Ethics, and Operational Security

### 🎯 Objective:

Understand the **ethical** and **legal boundaries**, and learn to operate safely and securely.

### 🔐 Topics:

- FCC/ETSI/ITU regulations
- ISM vs licensed bands
- Ham radio licensing (e.g. Technician in US)
- Transmit power and interference avoidance
- Covert radio, burst transmission, spectrum hiding
- Spectrum monitoring & direction finding (DF)

### 📚 Resources:

- 📘 [FCC Part 15 Rules](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-A/part-15)
- 📘 _ARRL Handbook for Radio Communications_
- Forums: [r/RTLSDR](https://reddit.com/r/rtlsdr), [MySdrLab](https://github.com/gh0stzk/MySdrLab)
- ITU-R Recommendations (for spectrum governance)

---

## 🔧 Final Projects & Capstone Ideas

|Project|Learning Outcome|
|---|---|
|Decode GPS signal from scratch|Master GNSS DSP & orbital geometry|
|Build LoRa mesh network with Pico/ESP32|Understand RF network layers|
|Construct software-only FM transceiver|RF DSP pipeline from scratch|
|Reverse unknown wireless protocol|Protocol RE, modulation inference|
|Build ADS-B flight tracker|Satellite reception, signal decoding|
|Receive NOAA weather satellite images|Antenna building, LNA, SDR pipeline|
|Make directional Wi-Fi antenna|Antenna theory, gain testing|
|Design + simulate patch antenna in 4NEC2|EM simulation, design optimization|
