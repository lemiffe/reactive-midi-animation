import MIDIInput = WebMidi.MIDIInput;
import {Observable} from 'rxjs/Observable';
import * as h from 'hyperscript';
import {defaultSettings, Setting} from '../types/Setting';
import {defaultGameState, graphicNames} from '../types/gameState';
import MIDIOutput = WebMidi.MIDIOutput;

/*
const GRAPHIC_TYPES = Object.keys(defaultGameState);

let storedSettings: Array<Setting>;
try {
    storedSettings = JSON.parse(window.localStorage.getItem('settings')) || [];
}
catch(e) {
    storedSettings = [];
    console.log('no stored settings could be parsed');
}

// Adds input items to a sidebar to allow users to select settings
export function getSettings(sideBarElement: Element): Observable<Array<Setting>>
{
    const initialSettings: Array<Setting> = [];
    const selectBoxes: Array<HTMLSelectElement> = [];

    defaultSettings.forEach((defaultSetting, index) => {
        const stored = storedSettings.find(item => item.id === defaultSetting.id);
        initialSettings.push(stored ? stored : defaultSetting);
        const selectBox = renderSelectBox(midiInput, GRAPHIC_TYPES, initialGraphicType, graphicNames);

    });

    sideBarElement.appendChild(h('div.input', [
        h('div.title', midiInput.name),
        h('div.selector', selectBox)]
    ));
    selectBoxes.push(selectBox);

    const getFormValues = (): Array<GraphicInputMapping> => {
        return midiInputs.map(input => {
            const graphicType = (<HTMLSelectElement>document.querySelector(`select[name="${input.id}"]`)).value;
            return {inputId: input.id, graphicType}
        });
    };

    const selectBoxes$ = Observable.merge(...selectBoxes.map(s => Observable.fromEvent(s, 'change').map(_ => getFormValues())));

    // return all select values if one of them changes
    return selectBoxes$
        .do(mapping => {
            window.localStorage.setItem('settings', JSON.stringify(mapping));
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
*/