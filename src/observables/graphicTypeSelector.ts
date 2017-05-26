import MIDIInput = WebMidi.MIDIInput;
import {Observable} from 'rxjs/Observable';
import * as h from 'hyperscript';
import {GraphicInputMapping} from '../types/graphicInputMapping';
import {defaultGameState, graphicNames} from '../types/gameState';
import MIDIOutput = WebMidi.MIDIOutput;

const GRAPHIC_TYPES = Object.keys(defaultGameState);

let storedMapping: Array<GraphicInputMapping>;
try {
    storedMapping = JSON.parse(window.localStorage.getItem('mapping')) || [];
}
catch(e) {
    storedMapping = [];
    console.log('no stored mapping could be parsed');
}

/**
 * Adds input items to a sidebar to allow users to select types of graphics to use per input
 * For example: MIDI Input 1 = Triangles
 * For example: MIDI Input 1 = Triangles
 */
export function getGraphicTypeSelection(midiInputs: Array<MIDIInput>, sideBarElement: Element): Observable<Array<GraphicInputMapping>>
{
    const initialMapping: Array<GraphicInputMapping> = [];
    const selectBoxes: Array<HTMLSelectElement> = [];
    const checkBoxes: Array<HTMLInputElement> = [];

    midiInputs.forEach((midiInput, index) => {
        const stored = storedMapping.find(m => m.inputId === midiInput.id);
        const initialGraphicType = stored ? stored.graphicType || GRAPHIC_TYPES[index] : GRAPHIC_TYPES[index];
        initialMapping.push({inputId: midiInput.id, graphicType: initialGraphicType});

        const checkBox = h('input', {type: 'checkbox', name: midiInput.id});
        const selectBox = renderSelectBox(midiInput, GRAPHIC_TYPES, initialGraphicType, graphicNames);
        sideBarElement.appendChild(h('div.input', [
            h('div.title', midiInput.name),
            h('div.selector', selectBox),
            h('div.sync', [
                h('label', 'lightsync'),
                checkBox])]
        ));

        selectBoxes.push(selectBox);
        checkBoxes.push(checkBox);
    });

    const getFormValues = (): Array<GraphicInputMapping> => {
        return midiInputs.map(input => {
            const graphicType = (<HTMLSelectElement>document.querySelector(`select[name="${input.id}"]`)).value;
            const redirectOutput = (<HTMLInputElement>document.querySelector(`input[type="checkbox"][name="${input.id}"]`)).checked;
            return {inputId: input.id, graphicType, redirectOutput}
        });
    };

    const checkBoxes$ = Observable.merge(...checkBoxes.map(c => Observable.fromEvent(c, 'change').map(_ => getFormValues())));
    const selectBoxes$ = Observable.merge(...selectBoxes.map(s => Observable.fromEvent(s, 'change').map(_ => getFormValues())));

    // return all select values if one of them changes
    return Observable.merge(checkBoxes$, selectBoxes$)
        .do(mapping => {
            window.localStorage.setItem('mapping', JSON.stringify(mapping));
        })
        .startWith(initialMapping);
}

function renderSelectBox(input: MIDIInput, graphicTypes: Array<string>, initialValue, labels: any): HTMLSelectElement {
    return h('select', {name: input.id},
        [h('option', {selected: initialValue === undefined}, 'none'),
            ...graphicTypes.map(graphicType =>
                h('option', {selected: graphicType === initialValue, label: labels[graphicType]}, graphicType)
            )]
    );
}