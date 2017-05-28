import {MidiInput} from "../types/midiInput";
import {ReplaySubject} from "rxjs/ReplaySubject";
/**
 * Emits all fake midi inputs available (keyboard, files)
 * @type {Subject<MidiInput>}
 */
export const fakeMidiInputs$ = new ReplaySubject<MidiInput[]>();
const fakeKeyboardMIDIInput = {
    input: {
        name: 'keyboard',
        id: '0',
        onmidimessage: null
    }
};

fakeMidiInputs$.next([<MidiInput>fakeKeyboardMIDIInput]);