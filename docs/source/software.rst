Software
========

Platform
--------

* Raspberry Pi 4 Model B
* Raspbian 32-bit, Raspbian GNU/Linux 10 (buster)
* Python 3 (3.7) for all peripheral handling (video, audio, button press)
* GPIO interrupts via the ``RPi.GPIO`` package
* GUI in `Kivy <https://kivy.org>`_

Architecture
------------

The software runs as two independent Python processes that communicate over
TCP/IP:

.. figure:: images/software-architecture.png
   :align: center
   :width: 60%

**HW server** (``HWSERVER``)
   Handles all interrupts on the Raspberry Pi GPIO ports and communicates
   with the external devices: it contains the implementations of the ECI,
   LSL and TTL protocols. It includes a multi-threaded TCP/IP server built on
   the ``socket`` and ``threading`` packages, so any TCP/IP client can use the
   hardware, locally or remotely. Several clients can control the hardware
   at the same time. The HW server runs as a daemon. It must be stable, and
   it copes with the recording system (NetStation) being shut down or not
   being available at start-up.

**Client** (``GUICLIENT``)
   The user interface: shows the hardware state and handles the touchscreen.
   After start-up the client automatically connects to the HW server on the
   local address.

Splitting the two means the time-critical interrupt code does not share a
process with the GUI event loop, and the GUI can also run remotely.

Client ↔ HW server message format
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Each message is sent as a fixed-length header that holds the message length
(ASCII, padded with spaces to ``HEADER`` bytes), followed by the encoded
message. The HW server replies with a text status, ``HWserver: OK`` on
success. The GUI uses the commands ``init`` (connect to the external
devices) and ``event`` (send a test event).

.. code-block:: python

   def send(self, msg, *args):
       self.clean_buffer(HWclient)
       message = msg.encode(FORMAT)
       msg_length = len(message)
       send_length = str(msg_length).encode(FORMAT)
       send_length += b' ' * (HEADER - len(send_length))
       ECIindicator = self.ids.ECIcheck
       try:
           HWclient.send(send_length)
           HWclient.send(message)
           HWserverResp = HWclient.recv(2048).decode(FORMAT)
           print(HWserverResp)
           # set the GUI connection indicator
           if HWserverResp == "HWserver: OK":
               ECIindicator.active = True
           else:
               ECIindicator.active = False
       except:
           print("HWserver not responding!")
           ECIindicator.active = False

Communication protocols
-----------------------

Lab Streaming Layer (LSL)
^^^^^^^^^^^^^^^^^^^^^^^^^

LSL uses the ``liblsl32.so`` library compiled from source for the ARM
architecture of the Raspberry Pi 4 (no prebuilt ARM binary worked with
``pylsl`` at the time).

Build on the Raspberry Pi:

.. code-block:: console

   $ git clone https://github.com/sccn/liblsl.git
   $ sudo apt-get update
   $ sudo apt-get install cmake libboost-all-dev
   $ cd liblsl
   $ mkdir build && cd build
   $ cmake -DLSL_LSLBOOST_PATH=lslboost ..
   $ time cmake --build . --target install

The build takes about 3 minutes and ends with::

   -- Installing: .../liblsl/build/install/bin/lslver
   real 2m49.814s

Install the library into ``pylsl`` under the name it expects:

.. code-block:: console

   $ sudo cp build/install/lib/liblsl.so.1.14.0 ~/.local/lib/python3.7/site-packages/pylsl/
   $ cd ~/.local/lib/python3.7/site-packages/pylsl/
   $ sudo mv liblsl.so.1.14.0 liblsl32.so
   $ sudo chmod 755 liblsl32.so

Test with the ``pylsl`` examples: ``PerformanceTest.py``, ``SendData.py`` /
``ReceiveData.py`` and ``SendStringMarkers.py`` / ``ReceiveStringMarkers.py``.
For example:

.. code-block:: console

   $ python3 ReceiveStringMarkers.py
   looking for a marker stream...
   got XXX at time 1603474683.5570102
   got Blah at time 1603474686.22354

Verified versions:

================= ======================================
Component         Version
================= ======================================
Board             Raspberry Pi 4 B
OS                Raspbian 32-bit GNU/Linux 10 (buster)
LSL               1.14.0
cmake             3.13.4-1
g++ / gcc         4:8.3.0-1+rpi2
libboost-all-dev  1.67.0.1+b1
================= ======================================

Useful references: `lsl_archived#74 <https://github.com/sccn/lsl_archived/issues/74>`_,
`lsl_archived#336 <https://github.com/sccn/lsl_archived/issues/336>`_,
`pylsl#2 <https://github.com/chkothe/pylsl/pull/2>`_.

Experiment Control Interface (ECI)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

ECI is the native protocol of the Magstim-EGI (formerly Philips) NetStation
system. It is implemented directly in the HW server according to the
specification in the Magstim-EGI / Philips *Amp Server Pro SDK* programmer's
manual.

The implementation builds on `PyNetstation
<https://github.com/imnotamember/PyNetstation>`_, which is Python 2 only. To
port its ``simple.py`` to Python 3:

* replace all ``1L`` long-integer literals with ``1`` (all integers are long
  in Python 3),
* replace ``self_socket.connect(str_address, port_no)`` with
  ``self_socket.connect((str_address, port_no))``,
* use ``from socket import socket as Socket`` instead of
  ``from socket_wrapper import Socket``,
* use ``import builtins as exceptions`` instead of ``import exceptions``.

TTL
^^^

TTL output is available for devices that support neither LSL nor ECI.

Keyboard emulator
^^^^^^^^^^^^^^^^^

An Arduino connected over USB emulates a keyboard, so events can be passed
to presentation software that reads key presses. Initial settings for the
keyboard emulation are in the Arduino ``setup()``.

Installing Kivy with the touchscreen
------------------------------------

Follow the standard `Kivy installation
<https://kivy.org/doc/stable/gettingstarted/installation.html>`_ and add the
`Raspberry Pi dependencies
<https://kivy.org/doc/stable/installation/installation-rpi.html>`_. Use a
virtual environment:

.. code-block:: console

   $ pip3 install virtualenv
   $ python3 -m virtualenv kivy_venv
   $ source kivy_venv/bin/activate
   $ python3 -m pip install kivy[full] kivy_examples
   $ sudo apt install libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev

The touchscreen does not work out of the box. Edit ``~/.kivy/config.ini``
(from `rpi-kivy-screen <https://github.com/mrichardson23/rpi-kivy-screen>`_):
replace the contents of the ``[input]`` section with

.. code-block:: ini

   [input]
   mouse = mouse
   mtdev_%(name)s = probesysfs,provider=mtdev
   hid_%(name)s = probesysfs,provider=hidinput

and hide the mouse cursor:

.. code-block:: ini

   [graphics]
   show_cursor = 0

.. tip::

   Do not use capital letters in the Kivy ``.kv`` file name or the ``App``
   class name. On Linux this results in a blank screen (Windows does not
   mind).

User interface
--------------

The UI is written in the Kivy language, which keeps the layout separate from
the functional code. The main widget is an accordion with four items that
follow the steps of an experiment (see :doc:`user-guide`). The layout code
below is from the current version.

Load profile (file browser):

.. code-block:: yaml

   <setSynchroWidget>:
       orientation: 'horizontal'
       AccordionItem:
           title: 'Load your profile'
           BoxLayout:
               orientation: 'vertical'
               FileChooserListView:
                   id: filechooser
                   size_hint_y: 0.9
               BoxLayout:
                   size_hint_y: 0.1
                   orientation: 'horizontal'
                   Button:
                       text: 'Load'
                       size_hint: None, None
                       size: 75, 50
                       background_color: (0.5, 1, 0.5, 1)
                       on_release: root.load(filechooser.path, filechooser.selection)

Connectivity matrix (sensors × protocols):

.. code-block:: yaml

   AccordionItem:
       title: 'Customize Setting'
       GridLayout:
           cols: 4
           Label:
           Label:
               text: 'LSL'
           Label:
               text: 'ECI'
           Label:
               text: 'TTL'
           Label:
               text: 'Screen sync'
           CheckBox:
               id: LSLscrCheck
           CheckBox:
               id: ECIscrCheck
           CheckBox:
               id: TTLscrCheck
           Label:
               text: 'Audio sync'
           CheckBox:
               id: LSLaudCheck
           CheckBox:
               id: ECIaudCheck
           CheckBox:
               id: TTLaudCheck
           Label:
               text: 'Response sync'
           CheckBox:
               id: LSLresCheck
           CheckBox:
               id: ECIresCheck
           CheckBox:
               id: TTLresCheck

Checklist:

.. code-block:: yaml

   AccordionItem:
       title: 'Checklist'
       Label:
           id: checkList
           text: 'a checklist loaded from your profile and test the settings...'

Connect and test:

.. code-block:: yaml

   AccordionItem:
       title: 'Run'
       GridLayout:
           cols: 3
           Label:
               text: 'LSL'
           Label:
               text: 'ECI'
           Label:
               text: 'TTL'
           CheckBox:
               active: False
           CheckBox:
               id: ECIcheck
               active: False
           CheckBox:
               active: False
           Button:
               text: 'Connect'
               background_color: (0.5, 1, 0.5, 1)
               on_release: root.send("init")
           Button:
               text: 'Test'
               background_color: (0.5, 0.5, 1, 1)
               on_release: root.send("event")
           Button:
               id: btnExit
               text: 'Exit'
               background_color: (1, 0.5, 0.5, 1)
               on_release: root.close()

The Kivy code calls the functional code through callbacks such as
``root.send("event")`` (see the message format above).

GPIO interrupts and Kivy
^^^^^^^^^^^^^^^^^^^^^^^^

The default Kivy clock rounds callbacks to the ``maxfps`` interval, which is
far too coarse for synchronization. The interrupt handling therefore lives in
the separate HW server process rather than in the GUI. If you
need Kivy callbacks outside the frame rate, look at the ``kivy_clock``
options ``interrupt``, ``free_all`` and ``free_only`` (or the
``KIVY_CLOCK`` environment variable).

Latency tips
------------

* In idle mode the GPIO interrupt latency is about 100 µs even with the
  default process priority.
* Under heavy CPU load latency can rise up to 2 ms. Increase the process
  priority and CPU resources for the HW server.
* The ``RPi.GPIO`` debounce works well for button inputs.
* A real-time kernel (``PREEMPT_RT``) is a possible further improvement.
  ``hackbench`` is useful for loading the OS during tests.
