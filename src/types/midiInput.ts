import MIDIInput = WebMidi.MIDIInput;
import {FakeMidiInput} from "./fakeMidiInput";

export type MidiInput = {
    input: MIDIInput|FakeMidiInput
}
