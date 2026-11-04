/* Settings-only adapter. Reuses PetrifyCore scheduler; no extra observer,
 * no polling and no mutations of native Settings controls. */
(() => {
  "use strict";
  const root=document.documentElement;
  let markedMain=null,markedSidebar=null;
  function set(prev,next,name){
    if(prev!==next){prev?.removeAttribute(name);next?.setAttribute(name,"");}
    return next;
  }
  function refresh(){
    const path=location.pathname;
    // The settings pane has its own route and should never be styled as chat.
    const route=/^\/settings(?:\/|$)/i.test(path);
    const settingsRoot=document.querySelector(
      '[data-testid="settings-page"],[data-testid="settings-screen"],[data-settings-root]');
    const isSettings=route || !!settingsRoot;
    // Avoid scanning buttons in long chats. Inspect settings controls only.
    const link=isSettings?[...document.querySelectorAll('a[href],button')].slice(0,100)
      .find(el=>el.textContent?.trim()==="Back to app"):null;
    root.toggleAttribute("data-pui-settings",isSettings);
    let nextMain=null,nextSidebar=null;
    if(isSettings){
      nextMain=document.querySelector("main,[role=main]");
      // Settings navigation has "Back to app" above its links.
      nextSidebar=link?.closest("aside,nav,[class*='sidebar'],[class*='Sidebar']")||
        document.querySelector("aside");
      // Do not style the regular chat sidebar if the link has disappeared.
      if(nextSidebar?.contains(document.querySelector("[data-pui-floating-sidebar]")))
        nextSidebar=null;
    }
    markedMain=set(markedMain,nextMain,"data-pui-settings-main");
    markedSidebar=set(markedSidebar,nextSidebar,"data-pui-settings-sidebar");
  }
  globalThis.PetrifyCore?.register("settings",refresh);
})();
