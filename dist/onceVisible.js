import o from"./element.js";export default(r,t)=>{const e=new IntersectionObserver(n=>{n[0].isIntersecting&&(t(),e.disconnect())});e.observe(o(r))};
