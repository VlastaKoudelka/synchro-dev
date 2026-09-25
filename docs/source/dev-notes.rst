Development notes
=================

Selected technical notes from the R&D notebook (2020–2022). They are useful
for anyone rebuilding or extending the device.

Known issues
------------

From the Stroop test sessions (January 2022):

* The keyboard emulator generates key presses when the Python script is not
  running. Fix: initialise the key emulation in the Arduino ``setup()``.
* The HW server crashes when streaming is turned off on the GTEN amplifier.
* The synchronization of OpenSesame and the Synchro device needs to be
  resolved when both send events.
* When the USB emulator is not connected, the photodiode input triggers all
  the time.
* One of the channels of the audio output does not trigger the AV tester.

Timeline of technical milestones
--------------------------------

2020-09
   GPIO interrupt latency of the Raspberry Pi measured with an Arduino as the
   test partner (Arduino sends a pulse, Pi answers on interrupt, Arduino
   time-stamps). With a generator and oscilloscope: idle latency about
   100 µs, up to 2 ms under load, reliable response even at 500 Hz. The
   Arduino Due clone was dropped from the validation process.

2020-10
   ``liblsl`` compiled on the Raspberry Pi (see :doc:`software`). New
   input board revision: split power rails with two linear regulators,
   more sensitive audio input, photodiode output through a Schmitt trigger.

2020-11
   Photodiode sensor built. First scripts sending markers from the Pi to
   NetStation (``Rpi_EGI_test_loop.py`` sends markers in a loop,
   ``Rpi_EGI_test.py`` sends a marker on each interrupt). Tested with the
   generator and with a button input.

2021-02
   Generator ↔ LabStreamer jitter measurement: 2 Hz square wave on GPIO 24
   and on LabStreamer input A0, 4500 trials, worst case 0.632 ms.

2021-03
   Arduino keyboard emulator integrated on the board.

2021-04 – 2021-06
   Kivy installed on the Pi with the touchscreen. First GUI based on the
   Kivy ``Accordion`` example.

2021-07
   Beta version defined: ECI in the GUI; new input circuits with a single
   power supply for the Pi and the circuits (no battery), and the LCD
   photodiode circuit inside the device with two inputs (LCD and
   projector).

2021-09
   PyNetstation ported to Python 3. Photodiode board ready and tested; main
   board sent to production.

2021-10
   TCP/IP split between the HW server daemon and the GUI client. Latency
   with the GUI running is about 70 µs (generator + oscilloscope). TTL input
   and output work from the GUI. Multiple starts/stops of the HW server are
   handled. The ECI protocol works in Python 3.

2021-12
   ``muse-lsl`` installed for tests with the Muse wearable EEG::

      sudo apt install libblas-dev libatlas-base-dev python3-matplotlib
      sudo pip3 install muselsl
      muselsl stream

2022-01
   Stroop test sessions comparing the Synchro device with the AV tester
   (288 trials), and an audio/video synchronization test with sound on the
   right and image on the left.

Ideas for further development
-----------------------------

* Real-time Linux kernel (``PREEMPT_RT``) for even lower latency under load.
* Synchronized camera as an accessory.
* Synchronized stimulation on the GTEN amplifier, e.g. triggered at stimulus
  onset or on a button press.
* Synchronizing EEG with events from continuous video/audio streams and
  with unpredictable stimuli.
* MRI-compatible version.
