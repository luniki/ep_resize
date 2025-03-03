'use strict';

let lastHeight;
let lastWidth;

exports.aceEditorCSS = () => ['ep_resize/static/css/styles.css'];

// SRC: http://youmightnotneedjquery.com/
const matches = (el, selector) => {
  const func = el.matches ||
      el.matchesSelector ||
      el.msMatchesSelector ||
      el.mozMatchesSelector ||
      el.webkitMatchesSelector ||
      el.oMatchesSelector;

  func.call(el, selector);
};

// JQuery implementation of "outerHeight()"
const elOuterHeight = (el) => Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight);

// JQuery implementation of "outerWidth()"
const elOuterWidth = (el) => Math.max(el.scrollWidth, el.offsetWidth, el.clientWidth);

const returnChildHeights = (children, offsetTop) => {
  offsetTop = offsetTop + 10 || 10; // Some extra padding for possible shadows etc.

  let maxHeight = 0;

  if (children.length) {
    maxHeight = 0;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const cid = child.getAttribute('id');
      const isIframe = matches(child, 'iframe');
      const isVisible = child.offsetWidth > 0 || child.offsetHeight > 0;
      const validElem = ['editorcontainerbox', 'editbar'].indexOf(cid) === -1;
      const hasHeight = child.offsetHeight > 0;

      // Avoid infinit increasing
      if (isVisible && validElem && !isIframe && hasHeight) {
        const childtop = (child.getBoundingClientRect().top + child.offsetHeight) + offsetTop;
        if (childtop > maxHeight) {
          maxHeight = childtop;
        }
      }
    }
  }

  return maxHeight;
};

const sendResizeMessage = (width, height) => {
  lastHeight = height;
  lastWidth = width;

  window.parent.postMessage({
    name: 'ep_resize',
    data: {
      width,
      height,
    },
  }, '*');
};

exports.aceEditEvent = (event, context) => {
  const padOuter = document.querySelector('iframe[name="ace_outer"]');
  const padInner = padOuter.contentWindow.document.querySelector('iframe[name="ace_inner"]');
  const popups = document.getElementsByClassName('popup-show');
  const menuRight = document.getElementsByClassName('menuRight')[0];
  const menuLeft = document.getElementsByClassName('menuLeft')[0];

  const aceOuterTop = padOuter.getBoundingClientRect().top;
  const aceInnerTop = padInner.getBoundingClientRect().top;

  const finalLine = (context.rep.lines.atIndex(context.rep.lines.length() - 1)).lineNode;
  const finalLineOuterHeight = elOuterHeight(finalLine);
  let menuBottomOffset = 0;

  if (menuLeft.getBoundingClientRect().top !== menuRight.getBoundingClientRect().top) {
    menuBottomOffset = menuRight.offsetHeight;
  }
  let newHeight = finalLine.getBoundingClientRect().top;
  newHeight += finalLineOuterHeight;
  newHeight += menuBottomOffset + 10;
  if (aceInnerTop > 0) {
    newHeight += aceInnerTop;
  }
  if (aceOuterTop > 0) {
    newHeight += aceOuterTop;
  }
  const newWidth = elOuterWidth(padInner);

  const maxChild = returnChildHeights(
      padOuter.contentWindow.document.querySelector('body').children,
      aceOuterTop
  ); // #outerdocbody
  const maxChildBody = returnChildHeights(document.querySelector('body').children);
  const maxPopups = returnChildHeights(popups) + menuBottomOffset;

  if (maxChildBody > maxChild) {
    newHeight = maxChildBody;
  }

  if (maxChild > newHeight) {
    newHeight = maxChild;
  }

  if (maxPopups > newHeight) {
    newHeight = maxPopups;
  }

  if (!lastHeight || !lastWidth || lastHeight !== newHeight || lastWidth !== newWidth) {
    if (newHeight - lastHeight !== 20 && newHeight - lastHeight !== -5) {
      sendResizeMessage(newWidth, newHeight);
    }
  }
};

exports.goToRevisionEvent = (hook, context) => {
  const editbar = document.getElementById('editbar');
  const elem = document.getElementById('outerdocbody');
  const newHeight = elOuterHeight(elem) + (editbar ? elOuterHeight(editbar) : 0);
  const newWidth = elOuterWidth(elem);

  if (!lastHeight || !lastWidth || lastHeight !== newHeight || lastWidth !== newWidth) {
    sendResizeMessage(newWidth, newHeight);
  }
};
