import element from './element.js';

// Too long and too short is only set when the actual input is changed, so we do it here
export default selector => {
  const instance = element(selector);
  if (instance.elementInternals) {
    const element = instance.formElement;
    const value = element.value;
    const minlength = element.getAttribute('minlength');
    const maxlength = element.getAttribute('maxlength');
    const validity = {
      valueMissing: element.validity.valueMissing,
      typeMismatch: element.validity.typeMismatch,
      patternMismatch: element.validity.patternMismatch,
      rangeUnderflow: element.validity.rangeUnderflow,
      rangeOverflow: element.validity.rangeOverflow,
      stepMismatch: element.validity.stepMismatch,
      badInput: element.validity.badInput,
      customError: element.validity.customError,
      tooShort: minlength ? value.length < parseInt(minlength) : false,
      tooLong: maxlength ? value.length > parseInt(maxlength) : false,
    };
    instance.elementInternals.setFormValue(value);
    instance.elementInternals.setValidity(validity, message(), element);

    return instance.elementInternals;

    function message() {
      if (validity.tooShort) {
        return `The text needs to be at least ${ minlength } characters long`;
      } else if (validity.tooLong) {
        return `The text needs to be at most ${ maxlength } characters long`;
      } else if (element.validationMessage) {
        return element.validationMessage;
      }
      return 'The value is invalid';
    }
  }
};