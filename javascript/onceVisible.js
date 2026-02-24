import element from './element.js';

export default (selector, callback) => {
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      callback();
      observer.disconnect();
    }
  });
  observer.observe(element(selector));
};