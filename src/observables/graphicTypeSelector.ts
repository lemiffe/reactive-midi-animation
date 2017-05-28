import MIDIInput = WebMidi.MIDIInput;
import {Observable} from 'rxjs/Observable';
import * as h from 'hyperscript';
import {GraphicInputMapping} from '../types/graphicInputMapping';
import {defaultGameState, graphicNames} from '../types/gameState';
import MIDIOutput = WebMidi.MIDIOutput;
import {MidiInput} from "../types/midiInput";
import {FakeMidiInput} from "../types/fakeMidiInput";

const GRAPHIC_TYPES = Object.keys(defaultGameState);

let storedMapping: Array<GraphicInputMapping>;
try {
    if (window.localStorage.getItem('graphicMapping')) {
        storedMapping = JSON.parse(window.localStorage.getItem('graphicMapping')) || [];
    } else {
        storedMapping = [];
    }
}
catch(e) {
    storedMapping = [];
    console.log('no stored mapping could be parsed');
}

let currentMapping: Array<GraphicInputMapping> = storedMapping ? storedMapping : [];

/**
 * Adds input items to a sidebar to allow users to select types of graphics to use per input
 * For example: MIDI Input 1 = Triangles
 * For example: MIDI Input 1 = Triangles
 */
export function getGraphicTypeSelection(
    midiInputs: Array<MidiInput>,
    fakeMidiInputs: Array<MidiInput>,
    sideBarElement: Element): Observable<Array<GraphicInputMapping>>
{
    const initialMapping: Array<GraphicInputMapping> = [];
    const selectBoxes: Array<HTMLSelectElement> = [];
    const checkBoxes: Array<HTMLInputElement> = [];

    // Clear sidebar (needed as now we always get full array of fake inputs, as they are dynamic) TODO: Improve?
    const items = document.querySelectorAll('div.input');
    if (items.length) {
        [].forEach.call(items, function(item) {
            item.remove();
            // TODO: Might need to kill existing change handlers?
        });
    }

    // Generate input items for each MIDI in + fake input
    [...midiInputs, ...fakeMidiInputs].forEach((midiInput, index) => {
        const stored = storedMapping.find(m => m.inputId === midiInput.input.id);
        const initialGraphicType = stored ? stored.graphicType || GRAPHIC_TYPES[index] : GRAPHIC_TYPES[index];
        initialMapping.push({inputId: midiInput.input.id, graphicType: initialGraphicType});

        const checkBox = h('input', {type: 'checkbox', name: midiInput.input.id});

        const selectBox = renderSelectBox(midiInput.input, GRAPHIC_TYPES, initialGraphicType, graphicNames);
        sideBarElement.appendChild(h('div.input', [
            h('div.title', midiInput.input.name),
            h('div.selector', selectBox),
            h('div.sync', [
                h('label', 'lightsync'),
                checkBox])]
        ));

        selectBoxes.push(selectBox);
        checkBoxes.push(checkBox);
    });

    const getFormValues = (): Array<GraphicInputMapping> => {
        const inputs = [...midiInputs, ...fakeMidiInputs];
        console.log('Inputs', inputs);
        const formValues = inputs.map(input => {
            const graphicType = (<HTMLSelectElement>document.querySelector(`select[name="${input.input.id}"]`)).value;
            const redirectOutput = (<HTMLInputElement>document.querySelector(`input[type="checkbox"][name="${input.input.id}"]`)).checked;

            //--------
            // This function only fires for new changes, so we need to update the mapping (for fakeMidiInputs)
            let mappingExists = false;
            currentMapping.forEach(function(item) {
                if(item.inputId === input.input.id) {
                    item.graphicType = graphicType;
                    item.redirectOutput = redirectOutput;
                    mappingExists = true;
                    return;
                }
            });

            const formValues = {inputId: input.input.id, graphicType, redirectOutput};

            if (!mappingExists) {
                currentMapping.push(formValues);
            }
            //--------

            return formValues;
        });
        console.log("CurrMap", currentMapping);
        return formValues;
    };

    const checkBoxes$ = Observable.merge(...checkBoxes.map(c => Observable.fromEvent(c, 'change').map(_ => getFormValues())));
    const selectBoxes$ = Observable.merge(...selectBoxes.map(s => Observable.fromEvent(s, 'change').map(_ => getFormValues())));

    // return all select values if one of them changes
    return Observable.merge(checkBoxes$, selectBoxes$)
        .do(mapping => {
            window.localStorage.setItem('graphicMapping', JSON.stringify(mapping));
        })
        .startWith(initialMapping);
}

function renderSelectBox(input: MIDIInput|FakeMidiInput, graphicTypes: Array<string>, initialValue, labels: any): HTMLSelectElement {
    return h('select', {name: input.id},
        [h('option', {selected: initialValue === undefined}, 'none'),
            ...graphicTypes.map(graphicType =>
                h('option', {selected: graphicType === initialValue, label: labels[graphicType]}, graphicType)
            )]
    );
}