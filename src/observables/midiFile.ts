import {Observable} from 'rxjs';
import {MIDINote} from '../types/midiNote';
import {Subject} from "rxjs/Subject";
import {areNotesEqual, midiFileMessageMapper} from "../utils/midiMapper";
import MIDIMessageEvent = WebMidi.MIDIMessageEvent;

export const midiFileNotes$ = new Subject<any>();

/**
 * Emits MIDINotes from a MIDI file
 * @type Subject<Array<MIDINote>>
 */
export const midiFile$: Observable<Array<MIDINote>> = midiFileNotes$
    .scan((pushedNotes: Array<MIDINote>, midiMessage: any) => {
        const midiNote = midiFileMessageMapper(midiMessage);

        // Filter out notes that have been killed
        if (midiMessage.name === "Note off") {
            let newPushedNotes = [];
            pushedNotes.forEach(note => {
                if (!(note.inputId === midiMessage.id &&
                    note.note.octave === midiNote.note.octave &&
                    note.note.key === midiNote.note.key)) {
                    newPushedNotes.push(midiNote);
                }
            });
            pushedNotes = newPushedNotes;
        }

        if (midiMessage.name === "Note on" && pushedNotes.indexOf(midiNote) === -1) {
            return [midiNote, ...pushedNotes];
        }
        return pushedNotes.filter(n => !areNotesEqual(n, midiNote));
    }, [])
    .distinctUntilChanged()
    .startWith([]);
