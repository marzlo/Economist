function applyEntryToIssues(list,item,ids){
 for(const issue of list){
  issue.entries=issue.entries||[];
  const index=issue.entries.findIndex(e=>e.id===item.id);
  if(ids.includes(issue.id)){
   const copy=JSON.parse(JSON.stringify(item));
   if(index>=0)issue.entries[index]=copy;else issue.entries.push(copy);
  }else if(index>=0)issue.entries.splice(index,1);
 }
}
