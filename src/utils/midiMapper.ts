import {range, flatMap} from 'lodash';
import {MIDINote} from '../types/midiNote';
import MIDIMessageEvent = WebMidi.MIDIMessageEvent;

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIDI_IDS = 128;
const OCTAVES = 11;

// Generate a map of midi codes
// 0 = key: C, octave: 0
// 13 = key: C#, octave: 1
// ...
const possibleNotes = flatMap(range(0, OCTAVES), (octave) => KEYS.map(key => ({ octave, key })));
const midiNotes = range(0, MIDI_IDS).map(i => possibleNotes[i]);

// Convert MIDI Message (from MIDI input) to MIDINote
export function midiMessageMapper(midiMessage: MIDIMessageEvent): MIDINote {
    const [origin, key, velocity] = midiMessage.data;

    // Some MIDI keyboards don't output origin 128 for off, they still send 144 but with velocity 0
    const onOff = (origin >= 144 && origin <= 159 && velocity > 0) ? 'on' : 'off';

    return {
        onOff: onOff,
        inputId: midiMessage.srcElement.id,
        note: midiNotes[key],
        velocity
    }
}

// Convert MIDI File Message to MIDINote
/**
 * @param midiMessage
 * e.g. {channel:1, delta:94, name:"Note on", noteName:"A1", noteNumber:33, tick:2112, track:1, velocity:79, file:?}
 * @returns {{onOff: (string|string), inputId, note: any, velocity: any}}
 */
export function midiFileMessageMapper(midiMessage: any): MIDINote {
    const key = midiMessage.noteNumber;
    const velocity = midiMessage.velocity;

    // Some MIDI keyboards don't output origin 128 for off, they still send 144 but with velocity 0
    const onOff = (velocity > 0) ? 'on' : 'off';

    return {
        onOff: onOff,
        inputId: midiMessage.file,
        note: midiNotes[key],
        velocity
    }
}

export function areNotesEqual(a: MIDINote, b: MIDINote): boolean {
    return a.inputId === b.inputId && a.note.key === b.note.key && a.note.octave === b.note.octave;
}
