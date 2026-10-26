export function discoveryHomeSections(categories) {
  const used=new Set(),sections=[];
  for(const [title,pattern] of [['推荐榜',/推荐榜|推荐排行/],['完本榜',/完本榜|完结榜/],['新书榜',/新书榜|新书排行/]]) {
    const entry=categories.find(item=>pattern.test(item.title)&&!used.has(item.url));
    if(entry){used.add(entry.url);sections.push({title,entry});}
  }
  if(!sections.length)for(const entry of categories.slice(0,3)){
    if(!used.has(entry.url)){used.add(entry.url);sections.push({title:entry.title,entry});}
  }
  if(!sections.some(section=>section.title==='新书榜')){
    const latest=categories.find(entry=>entry.title==='最新更新'&&!used.has(entry.url));if(latest)sections.push({title:latest.title,entry:latest});
  }
  return sections;
}
