"""Planning assumptions, not forecasts. Run with Python 3; no dependencies."""
import json,math
from pathlib import Path
ROOT=Path(__file__).parent
SCENARIOS={
'Conservative':dict(aov=180,food=.40,direct=.25,commission=.354,direct_discount=.04,platform_discount=.08,delivery=25,packaging=16,waste=.04,refund=.02,ads_direct=5,ads_platform=10,variable_labour=5),
'Base':dict(aov=220,food=.35,direct=.60,commission=.295,direct_discount=.03,platform_discount=.06,delivery=20,packaging=15,waste=.02,refund=.01,ads_direct=4,ads_platform=8,variable_labour=5),
'Optimistic':dict(aov=250,food=.32,direct=.80,commission=.236,direct_discount=.02,platform_discount=.04,delivery=15,packaging=15,waste=.015,refund=.005,ads_direct=3,ads_platform=6,variable_labour=5)}
def calc(n,s):
 q=n*26;p=s['aov'];d=s['direct'];r=q*p
 c={'Food':r*s['food'],'Packaging':q*s['packaging'],'Platform charges':r*(1-d)*s['commission'],'Payment':r*d*.01,'Discounts':r*(d*s['direct_discount']+(1-d)*s['platform_discount']),'Delivery subsidy':q*d*s['delivery'],'Wastage':r*s['waste'],'Refunds':r*s['refund'],'Acquisition':q*(d*s['ads_direct']+(1-d)*s['ads_platform']),'Variable labour':q*s['variable_labour']}
 fixed={'Electricity':2000,'Gas':3000,'Cleaning':1500,'Maintenance':1000,'Rent allocation':5000,'Fixed marketing':4000,'Other':3000,'Depreciation':2000,'Owner labour':20000 if n<=50 else 30000,'Helper labour':0 if n<=20 else 8000 if n<=30 else 12000 if n<=50 else 30000 if n<=75 else 45000,'Extra commercial rent':0 if n<=30 else 15000 if n<=75 else 25000}
 contribution=r-sum(c.values());net=contribution-sum(fixed.values());owner_hours=26*(5 if n<=10 else 7 if n<=20 else 8 if n<=30 else 9 if n<=50 else 10)
 return dict(orders_day=n,orders_month=q,aov=p,revenue_day=n*p,revenue=r,costs=c,fixed=fixed,contribution_order=contribution/q,total_cost=sum(c.values())+sum(fixed.values()),profit_before_owner=net+fixed['Owner labour'],economic_profit_pre_income_tax=net,net_margin=net/r,owner_hours=owner_hours,implied_hourly=(net+fixed['Owner labour'])/owner_hours,breakeven_orders=math.ceil(sum(fixed.values())/(contribution/q)/26) if contribution>0 else None)
def table(headers,rows):return '| '+' | '.join(headers)+' |\n| '+' | '.join(['---']*len(headers))+' |\n'+'\n'.join('| '+' | '.join(str(v) for v in row)+' |' for row in rows)+'\n'
fmt=lambda x:f'{x:,.0f}'
results={k:[calc(n,s) for n in [10,20,30,50,75,100]]for k,s in SCENARIOS.items()}
(ROOT/'financial-results.json').write_text(json.dumps(results,indent=2))
text='# Financial model — 10 September 2026\n\nAll values are assumptions in INR. 26 trading days/month; menu revenue excludes output GST and customer-paid delivery charges. Platform charges are assumed all-in service deductions, not a verified contract or statutory rate. Restaurant-funded discounts and marketing are deducted separately. No double-counting of commission tax. Net figures are economic profit before income tax; actual post-tax net profit is unavailable without entity/tax details. Variable labour covers incremental packing work and is separate from fixed helper wages. Food cost excludes separately modelled wastage.\n\n'
for name,s in SCENARIOS.items():
 text+='## '+name+'\n\nAssumptions: '+json.dumps(s)+'\n\n'
 text+=table(['Orders/day','AOV','Revenue/day','Revenue/month','All cost','Before owner pay','After owner pay','Margin'],[[v['orders_day'],fmt(v['aov']),fmt(v['revenue_day']),fmt(v['revenue']),fmt(v['total_cost']),fmt(v['profit_before_owner']),fmt(v['economic_profit_pre_income_tax']),f"{v['net_margin']:.1%}"]for v in results[name]])+'\n'
 text+='### Cost detail, monthly\n\n'
 labels=list(results[name][0]['costs'])+list(results[name][0]['fixed'])
 text+=table(['Cost']+[str(v['orders_day'])+'/day' for v in results[name]],[[label]+[fmt((v['costs']|v['fixed'])[label]) for v in results[name]]for label in labels])+'\n'
base=SCENARIOS['Base'];b=calc(30,base)
text+='## Owner economics — base assumptions\n\n'+table(['Orders/day','Hours/month','Before owner pay','Owner pay allocation','After owner pay','Implied hourly earnings'],[[v['orders_day'],v['owner_hours'],fmt(v['profit_before_owner']),fmt(v['fixed']['Owner labour']),fmt(v['economic_profit_pre_income_tax']),fmt(v['implied_hourly'])]for v in results['Base']])
text+='\n## Channel economics at ₹220\n\n'
for name,d in [('Direct',1),('Platform',0),('Mixed',.6)]:
 v=calc(30,{**base,'direct':d});text+=name+': '+fmt(v['contribution_order'])+' contribution/order; '+f"{v['contribution_order']/220:.1%}"+' contribution margin. Food-only gross margin is 65%; this is not take-home profit.\n\n'
text+='## Platform price ladder — base costs\n\n'+table(['Menu value','After platform fee + funded discount','Contribution after all variable costs'],[[p,fmt(p*(1-.295-.06)),fmt(calc(30,{**base,'aov':p,'direct':0})['contribution_order'])]for p in [150,200,250,300,400]])
text+='\n## Sensitivity — base, 30 orders/day\n\n'
changes=[('Food +10% relative',30,{'food':.385}),('Food +20% relative',30,{'food':.42}),('Platform charges +5 percentage points',30,{'commission':.345}),('AOV -10%',30,{'aov':198}),('Orders -20%',24,{}),('Orders +20% (commercial cost step)',36,{}),('Packaging +₹5',30,{'packaging':20}),('Variable acquisition doubles',30,{'ads_direct':8,'ads_platform':16}),('Wastage from 2% to 5%',30,{'waste':.05})]
text+=table(['Change','Economic profit','Change versus base'],[[name,fmt((v:=calc(n,{**base,**delta}))['economic_profit_pre_income_tax']),fmt(v['economic_profit_pre_income_tax']-b['economic_profit_pre_income_tax'])]for name,n,delta in changes])
text+='\nFixed marketing doubling adds a further ₹4,000 monthly cost. If both fixed and variable marketing double, combine both changes. Order increases can reduce profit when they trigger helper/commercial-premises costs. Fixed costs are planning steps, not verified capacity limits.\n'
(ROOT/'financial-model.md').write_text(text)
for k,v in results.items():print(k,[(r['orders_day'],round(r['economic_profit_pre_income_tax']),round(r['contribution_order'],2))for r in v])
