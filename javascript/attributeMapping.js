import { get } from './options.js';

const defaults = {
  boolean: {
    autofocus: ['button', 'input', 'select', 'textarea'],
    autoplay: ['audio', 'video'],
    checked: ['input'],
    controls: ['audio', 'video'],
    default: ['track'],
    defer: ['script'],
    disabled: ['button', 'input', 'optgroup', 'option', 'select', 'textarea', 'fieldset'],
    formnovalidate: ['button', 'input'],
    ismap: ['img'],
    loop: ['audio', 'video'],
    multiple: ['input', 'select'],
    muted: ['audio', 'video'],
    novalidate: ['form'],
    open: ['details', 'dialog'],
    playsinline: ['video'],
    readonly: ['input', 'textarea'],
    required: ['input', 'select', 'textarea'],
    reversed: ['ol'],
  },
  keyValue: {
    accept: ['input'],
    autocomplete: ['input', 'select', 'textarea'],
    cols: ['textarea'],
    dirname: ['input', 'textarea'],
    max: ['input'],
    maxlength: ['input', 'textarea'],
    min: ['input'],
    minlength: ['input', 'textarea'],
    name: ['input', 'select', 'textarea'],
    pattern: ['input'],
    placeholder: ['input', 'textarea'],
    rows: ['textarea'],
    size: ['input', 'select'],
    step: ['input'],
    type: ['input'],
    value: ['input', 'select'],
    width: ['input'],
    wrap: ['textarea'],
    htmlFor: ['label'],
    for: ['label'],
    href: ['a'],
    src: ['audio', 'img', 'input', 'video'],
  },
  // Attributes that should not be tracked
  blackList: ['class', 'extends', 'id', 'part']
};



export default () => {
  const { keyValueAttributes, booleanAttributes, blackList } = get();
  return {
    keyValue: { ...defaults.keyValue, ...keyValueAttributes },
    boolean: { ...defaults.boolean, ...booleanAttributes },
    blackList: [ ...defaults.blackList, ...blackList ],
  };
};