export const copyText = function(text) {
    var el = document.createElement("textarea");
    el.innerText= text;
    el.setAttribute("visibility", "hidden");
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
}