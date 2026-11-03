import crypto from 'node:crypto';
import readline from 'node:readline';
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
rl.question('Enter shared dashboard password: ',p=>{if(p.length<14){console.error('Use at least 14 characters');process.exitCode=1}else{const salt=crypto.randomBytes(16).toString('hex');console.log('DASHBOARD_PASSWORD_HASH=scrypt:'+salt+':'+crypto.scryptSync(p,salt,64).toString('hex'));console.log('SESSION_SECRET='+crypto.randomBytes(32).toString('hex'));console.log('REPORT_UPLOAD_TOKEN='+crypto.randomBytes(32).toString('hex'))}rl.close()});
