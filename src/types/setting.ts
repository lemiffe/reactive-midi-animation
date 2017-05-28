export type Setting = {
    id: string;
    label: string;
    value: String|Array<String>;
};

export const defaultSettings : Array<Setting> = [
    {id: 'background', label: 'Background colour', value: '#111111'},
    {id: 'decay', label: 'Decay time (ms)', value: '1000'},
];