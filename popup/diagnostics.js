/* PetrifyUI on-demand structural DOM inspector.
   No observers, page text, chat content, or network transmission. */
window.petrifyInspect = async function () {
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (!tab || !/^https:\/\/(www\.)?chatgpt\.com\//.test(tab.url || "")) {
    throw new Error("Open a chatgpt.com tab first.");
  }
  const [{result}] = await chrome.scripting.executeScript({
    target:{tabId:tab.id},world:"ISOLATED",
    func: () => {
      const t0=performance.now();
      const root=document.documentElement;
      const selected={
        assistant:'[data-message-author-role="assistant"]',
        proseContainers:'main :is(.markdown,.prose,[class*="markdown"],[class*="prose"])',
        anyList:'main :is(ul,ol) > li',
        anyInlineCode:'main code:not(pre code)',
        anyCodeBlock:'main pre',
        genericRoleMessages:'main [data-message-author-role],main article,main [role="article"]',
        turn:'[data-testid^="conversation-turn"]',
        list:'[data-message-author-role="assistant"] li',
        inlineCode:'[data-message-author-role="assistant"] code:not(pre code)',
        blockCode:'[data-message-author-role="assistant"] pre',
        editor:'#prompt-textarea,[data-testid="prompt-textarea"],[contenteditable="true"][role="textbox"]',
        composer:'[data-petrifyui-composer],[data-pui-stage-composer]',
        footer:'[data-pui-composer-dock],[data-composer-trailing-controls="true"]',
        main:'[data-pui-main-stage]',
        sidebar:'[data-pui-floating-sidebar]'
      };
      const clean = (el) => {
        if (!el) return null;
        const s=getComputedStyle(el),r=el.getBoundingClientRect();
        const marker=el.matches('li')?getComputedStyle(el,'::marker'):null;
        const before=el.matches('li')?getComputedStyle(el,'::before'):null;
        return {
          tag:el.localName,
          id:el.id || null,
          classes:[...el.classList].slice(0,12),
          testid:el.getAttribute("data-testid"),
          role:el.getAttribute("role"),
          dataMarkers:[...el.attributes].filter(a=>a.name.startsWith("data-pui")||a.name.startsWith("data-petrifyui")).map(a=>a.name),
          styles:{color:s.color,textFill:s.webkitTextFillColor,background:s.backgroundColor,
            backgroundImage:s.backgroundImage==="none"?"none":"image/gradient",
            listStyle:s.listStyleType,display:s.display,position:s.position,
            font:s.fontFamily,fontSize:s.fontSize,accent:s.accentColor,
            proseBullets:s.getPropertyValue("--tw-prose-bullets").trim()||null},
          marker:marker?{content:marker.content,color:marker.color,fill:marker.webkitTextFillColor}:undefined,
          before:before?{content:before.content,color:before.color}:undefined,
          rect:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}
        };
      };
      const results={};
      for(const [key,selector] of Object.entries(selected)){
        const nodes=[...document.querySelectorAll(selector)];
        results[key]={count:nodes.length,examples:nodes.slice(0,3).map(clean)};
      }
      const editor=document.querySelector(selected.editor);
      const ancestors=[];
      for(let el=editor,depth=0;el && depth<12;el=el.parentElement,depth++){
        ancestors.push(clean(el));
      }
      return {
        schema:2,kind:"petrifyui-structural-diagnostic",
        note:"No chat text, input values, or URLs captured.",
        routeKind:location.pathname==="/"?"new-chat":"conversation-or-other",
        viewport:{width:innerWidth,height:innerHeight},
        themeActive:root.hasAttribute("data-petrifyui-active"),
        stageStatus:root.getAttribute("data-pui-stage-status"),
        contentStatus:results.anyList.count || results.anyInlineCode.count || results.anyCodeBlock.count ? "content-found" : "no-target-content-in-current-DOM",
        results,editorAncestors:ancestors,
        durationMs:Math.round((performance.now()-t0)*100)/100
      };
    }
  });
  return result;
};
