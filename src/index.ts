import {Observable, Scheduler, Subject} from 'rxjs';
import {defaultGameState, GameState} from './types/gameState';
import {pixiApp} from './renderer';
import {keyboard$} from './observables/keyboard';
import {midiFileNotes$, midiFile$} from './observables/midiFile';
import {midiInputs$, midiInputTriggers$, midiOutput$, midiOutSubject$} from './observables/midi';
import MIDIInput = WebMidi.MIDIInput;
import '../node_modules/skeleton-css/css/skeleton.css';
import './styles/index.css';
import './styles/fire.css';
import {getGraphicTypeSelection} from './observables/graphicTypeSelector';
import {mutateGameState} from './state/index';
import MIDIOutput = WebMidi.MIDIOutput;
import {DMX_CONSTANTS} from './dmxConstants';
import {MidiInput} from "./types/midiInput";
import {fakeMidiInputs$} from "./observables/fakeMidi";
import {ReplaySubject} from "rxjs/ReplaySubject";
const MidiPlayer = require('midi-player-js');

let playingMidiFile = false;

const TICKER_INTERVAL = 17;
const ticker$ = Observable
    .interval(TICKER_INTERVAL, Scheduler.animationFrame)
    .map(() => ({
        time: Date.now(),
        deltaTime: null
    }))
    .scan(
        (previous, current) => ({
            time: current.time,
            deltaTime: (current.time - previous.time) / 1000
        })
    );

// Keep an array (state) with all current fake midi inputs, and create an observable (for the mapping)
let currentFakeMidiInputs : Array<MidiInput> = [];
const currentFakeMidiInputs$ = new ReplaySubject<Array<MidiInput>>();
fakeMidiInputs$.subscribe(newInputs => {
    newInputs.forEach(function(newInput) {
        let inArray = false;
        currentFakeMidiInputs.forEach(function(currentInput) {
            if (currentInput.input.id === newInput.input.id) {
                inArray = true;
                return;
            }
        });

        if (!inArray) {
            currentFakeMidiInputs.push(newInput);
        }

        // TODO: Reverse (ones that have been removed)

        // Next the whole array (so that they are all picked up)
        currentFakeMidiInputs$.next(currentFakeMidiInputs);
    });
});

const graphicMapping$ = Observable
    .combineLatest(midiInputs$, currentFakeMidiInputs$)
    .flatMap(([midiInputs, fakeMidiInputs]) => {
    console.log('MIDI inputs (pre):', midiInputs); // TODO: Remove
    console.log('Fake inputs (pre):', fakeMidiInputs); // TODO: Remove
    return getGraphicTypeSelection(midiInputs, fakeMidiInputs, document.querySelector('.sidebar'));
});

const midi$ = Observable.merge(keyboard$, midiInputTriggers$, midiFile$);

midi$.subscribe(what => { console.log("Midi event:", what);}); // TODO: Remove

const gameLoop$ = ticker$.combineLatest(midi$, graphicMapping$)
    .do(([ticker, midiNotes, graphicMapping]) => {
        midiOutSubject$.next({midiNotes, graphicMapping});
    })
    .scan((state: GameState, [ticker, midiNotes, graphicMapping]) =>
            mutateGameState(state, midiNotes, ticker, graphicMapping)
        , defaultGameState);

// WAV & MIDI Playback (file loader)
// ========================================

const sidebar = document.querySelector('.sidebar');
let midiFiles : object = {};
let wavFile = null;
const wavPlayer = new Audio();

// canplaythrough event is fired when enough of the audio has downloaded
// to play it through at the current download rate
wavPlayer.addEventListener('canplaythrough', audioLoadedHandler);

// TODO: Create inputs with filenames after every midi file load
// TODO: Cleanup this code
// TODO: Add item to sidebar with files that have been loaded + allow user to remove files (removes from obj!)

function handleFileSelect(event) {
    const files = input.files;

    // Allowed media types
    const accept = { binary : ["audio/midi", "audio/wav"] };

    const fr = new FileReader();
    fr.onload = function(e) {
        // Load MIDI file
        if (e.target['result'].substring(0, 15) === "data:audio/midi") {
            // Add player (with full file contents) to midiFiles object (to play/stop with event handlers)
            let safeFilename = files[0].name.replace('.mid', '').replace('.', '-');
            midiFiles[safeFilename] = new MidiPlayer.Player(function (event) {
                // Fire every event (including note off)
                event.file = safeFilename; // Attach filename to event (for input mapping)
                midiFileNotes$.next(event);
            });

            // Load MIDI file into memory
            midiFiles[safeFilename].loadDataUri(e.target['result']);

            // Add new input for this file
            const fakeFileInput = {
                input: {
                    name: safeFilename,
                    id: safeFilename,
                    onmidimessage: null
                }
            };

            fakeMidiInputs$.next([<MidiInput>fakeFileInput]);
        }
    };

    if (files.length) {
        let file = files[0];
        if (file !== null) {
            if (accept.binary.indexOf(file.type) > -1) {
                if (file.type === "audio/midi") {
                    // Load midi file (see fr.onload above)
                    console.log("Loading MIDI file");
                    fr.readAsDataURL(file);
                } else if (file.type === "audio/wav") {
                    // Load WAV file
                    console.log("Loading WAV file");
                    wavFile = URL.createObjectURL(file);
                    wavPlayer.src = wavFile;
                }
            } else {
                console.log("Wrong file type: ", file.type);
            }
        }
    }
}

function audioLoadedHandler(e) {
    // Audio has loaded, show the page
    console.log('Wav ready to play');
    // Todo: Disallow playback if still loading
}

// Input: File
let input = document.createElement('input');
input.type = 'file';
input.name = 'file';
sidebar.appendChild(input);
input.addEventListener('change', handleFileSelect, false);

// Button: Start
let start = document.createElement('button');
input.innerHTML = 'start';
sidebar.appendChild(start);
start.addEventListener('click', function() {
    console.log('start');

    // Wav
    if (wavFile !== null) {
        console.log('Playing wave file');
        wavPlayer.play();
    }

    // Midi
    Object.keys(midiFiles).forEach(key => {
        midiFiles[key].play();
    });

    playingMidiFile = true;
}, false);

// Button: Stop
let stop = document.createElement('button');
input.innerHTML = 'stop';
sidebar.appendChild(stop);
stop.addEventListener('click', function() {
    console.log('stop');

    // Wav
    if (wavFile !== null) {
        console.log('Stopping wave file');
        wavPlayer.pause();
        wavPlayer.currentTime = 0;
    }

    // Midi
    Object.keys(midiFiles).forEach(key => {
        midiFiles[key].stop();
    });

    playingMidiFile = false;
}, false);

//canvasDomContainer.querySelector('canvas').addEventListener('dblclick', fullscreenHandler);
const keyDowns = Observable.fromEvent(document, 'keydown');

keyDowns.subscribe(function(e) {
    if (e["key"] === "Enter") {
        if (playingMidiFile) {
            stop.click();
        } else {
            start.click();
        }
    }
});

// ========================================

// PixiApp
pixiApp.init(document.querySelector('.fireplace'), defaultGameState);

// Gameloop
gameLoop$
    .subscribe((gameState: GameState) => {
        pixiApp.render(gameState);
    });

// DMX Lights
let time = 0;
const MIDI_OUT_DEVICE = 'IAC Driver IAC Bus 4';
midiOutSubject$
    .withLatestFrom(midiOutput$)
    .throttleTime(50)
    .subscribe(([notesMapping, midiOutputs]) => {
        // when midi notes id match mapping with a redirect
        // send these to a hardcoded midi output
        const notesToSend = notesMapping.midiNotes
            .filter(n => notesMapping.graphicMapping
                .find(m => m.inputId === n.inputId && m.redirectOutput)
            );

        const output = midiOutputs.find(o => o.name === MIDI_OUT_DEVICE);
        if (!output) {
            return;
        }

        if (notesToSend.length) {
            time += 1;
            console.log(time, notesToSend);

            if (time % 2 === 0 ) {
                output.send(DMX_CONSTANTS.BLINDER_LEFT_ON);
            } else {
                output.send(DMX_CONSTANTS.BLINDER_RIGHT_ON);
            }
            output.send(DMX_CONSTANTS.BLACKOUT_OFF);
        } else {
            output.send(DMX_CONSTANTS.BLINDER_LEFT_OFF);
            output.send(DMX_CONSTANTS.BLINDER_RIGHT_OFF);
            output.send(DMX_CONSTANTS.BLACKOUT_ON);
        }

    });
