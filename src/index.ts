import {Observable, Scheduler} from 'rxjs';
import {defaultGameState, GameState} from './types/gameState';
import {pixiApp} from './renderer';
import {keyboard$} from './observables/keyboard';
import {midiInputs$, midiInputTriggers$, midiOutput$, midiOutSubject$} from './observables/midi';
import MIDIInput = WebMidi.MIDIInput;
import '../node_modules/skeleton-css/css/skeleton.css';
import './styles/index.css';
import './styles/fire.css';
import {getGraphicTypeSelection} from './observables/graphicTypeSelector';
import {mutateGameState} from './state/index';
import MIDIOutput = WebMidi.MIDIOutput;
import {DMX_CONSTANTS} from './dmxConstants';
var MidiPlayer = require('midi-player-js');

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

const graphicMapping$ = Observable.combineLatest(midiInputs$, midiOutput$).flatMap(([midiInputs, midiOutpus]) => {
    return getGraphicTypeSelection(midiInputs, document.querySelector('.sidebar'));
});

const midi$ = Observable.merge(keyboard$, midiInputTriggers$);

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
let midiFiles = {};
let wavFile = null;

// Midi player (should be multiple? one per file loaded?)
let midiPlayer = new MidiPlayer.Player(function(event) {
    // Test
    if (event.name == 'Note on' && event.velocity > 0) {
        console.log(event);
    }
});


const wavPlayer = new Audio();

// canplaythrough event is fired when enough of the audio has downloaded
// to play it through at the current download rate
wavPlayer.addEventListener('canplaythrough', audioLoadedHandler);

function handleFileSelect(event) {
    const files = input.files;

    // Allowed media types
    const accept = { binary : ["audio/midi", "audio/wav"] };

    const fr = new FileReader();
    fr.onload = function(e) {
        if (e.target['result'].substring(0, 15) === "data:audio/midi") {
            midiFiles[files[0].name] = e.target['result']; // Contains full data URL for midi file (blob)
            console.log(midiFiles);
        }
        midiPlayer.loadDataUri(e.target['result']);
        //if (window.hasOwnProperty('playMidi')) {
        //    window['midiFile'] = e.target['result'];
        //    window['loadMidi'].call();
        //}
    };

    if (files.length) {
        // If MIDI file
        let file = files[0];
        if (file !== null) {
            if (accept.binary.indexOf(file.type) > -1) {
                if (file.type === "audio/midi") {
                    // Load midi file to dictionary (see fr.onload above)
                    fr.readAsDataURL(file);
                } else if (file.type === "audio/wav") {
                    wavFile = URL.createObjectURL(file);
                    wavPlayer.src = wavFile;
                    console.log(wavFile);
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
    // Todo: start each midi file
    midiPlayer.play();
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
    // Todo: stop each midi file
    midiPlayer.stop();
}, false);

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
