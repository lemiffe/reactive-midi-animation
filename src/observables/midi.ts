import {Observable} from 'rxjs';
import MIDIInput = WebMidi.MIDIInput;
import MIDIMessageEvent = WebMidi.MIDIMessageEvent;
import {MIDINote} from '../types/midiNote';
import {areNotesEqual, midiMessageMapper} from '../utils/midiMapper';
import MIDIAccess = WebMidi.MIDIAccess;
import {Subject} from 'rxjs/Subject';
import MIDIOutput = WebMidi.MIDIOutput;
import {GraphicInputMapping} from '../types/graphicInputMapping';
import MIDIPortType = WebMidi.MIDIPortType;
import {MidiInput} from "../types/midiInput";

export const midiAccess$ = Observable.fromPromise(navigator.requestMIDIAccess());

/**
 * Emits all midi inputs available
 * @type Observable<Array<MidiInput>>
 */
export const midiInputs$ = midiAccess$.map((midi: MIDIAccess) => {
    return Array.from(midi.inputs).map(([id, input]) => { return {input: input}});
});

/**
 * Emits all midi outputs available
 * @type Observable<Array<MIDIOutput>>
 */
export const midiOutput$ = midiAccess$.map((midi: MIDIAccess) => {
    return Array.from(midi.outputs).map(([id, output]) => output);
});

/**
 * Emits whenever one of the MIDI instruments plays a note
 * Only pushed notes are emitted
 * @type Observable<Array<MIDINote>>
 */
export const midiInputTriggers$: Observable<Array<MIDINote>> = midiInputs$
    .flatMap(inputs =>
        Observable.create((observer) =>
            inputs.forEach(i =>
                i.input.onmidimessage = (event) => observer.next(event)
            )
        )
    )
    .filter((midiMessage: MIDIMessageEvent) =>
        midiMessage.data[0] >= 128 && midiMessage.data[0] <= 159
    )
    .scan((pushedNotes: Array<MIDINote>, midiMessage: MIDIMessageEvent) => {
        const midiNote = midiMessageMapper(midiMessage);
        if (midiNote.onOff === 'on' && pushedNotes.indexOf(midiNote) === -1) {
            return [midiNote, ...pushedNotes];
        }
        return pushedNotes.filter(n => !areNotesEqual(n, midiNote));
    }, [])
    .distinctUntilChanged()
    .startWith([]);


export const midiOutSubject$ = new Subject<{midiNotes: Array<MIDINote>, graphicMapping: Array<GraphicInputMapping>}>();