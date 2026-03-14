const fs = require('fs');
const functions = require("./backend/algorithms/bowlingBallScoreAlgos")

function test(bowlingBall) {
    
    var hookPot = functions.hookPotential(bowlingBall);
    var eVL = functions.earlyVLate(bowlingBall);
    var sVA = functions.smoothVAngular(bowlingBall);
    
    console.log("hook potential: ", hookPot)
    console.log("early-late score: ", eVL)
    console.log("smooth-angular score: ", sVA)
    console.log("---------------------------------------")
    return {hookPot, eVL, sVA};
}

function test2(bowlingBallFinishName, bowlingBallCoverstockName) {
    
    var finishNumber = functions.finishNametoNumber(bowlingBallFinishName, bowlingBallCoverstockName);
    
    console.log("finishNumber: ", finishNumber)
    console.log("---------------------------------------")
}

function testingWorkFlow () {
    // const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('./validation_data.json', 'utf-8'));


    // const fs = require('fs');/
    fs.writeFileSync('output.csv', 'Series,Ball,CoverSName,CoverSFinish,Weight,RG,DIFF,MBDIFF,Finish_Number,Length,Backend,Hook,eVL,sVA,HookPotential\n');

    for (const [seriesName, weights] of Object.entries(data)) {
        for (const [weight, spec] of Object.entries(weights)) {

            const rgKey = `${weight}# RG`;
            const diffKey = `${weight}# DIFF`;
            const intKey = `${weight}# INT. DIFF`;

            const RG = spec['CORE STATS'][rgKey];
            const DIFF = spec['CORE STATS'][diffKey];
            const INTDIFF = spec['CORE STATS'][intKey];
        
            if (!RG || RG.length === 0) continue;
            //
            // REMOVE GRIT
            // REMOVE REACTIVE
            // THERE MAY EXIST PARITAL MATCHES
            // FIRST CONSIDER ALL PERFECTS MATCHES
            // THEN CONSIDER PARTIAL MATCHES
            // OUTPUT INTO A CSV SO WE CAN SORT AGAINST HOOK, EVA, SVA AND SEE AGAINST VALIDATION
            //
            const MBDIFF = INTDIFF

            // Coverstock — first key is name, second is finish
            const coverstockEntries = Object.entries(spec['COVERSTOCK']);
            if (!coverstockEntries || coverstockEntries.length === 0) continue;
            if (!coverstockEntries[0][0] || !coverstockEntries[0][1]) continue;
            const coverstockName   = (coverstockEntries[0][1]  + ' ' +  coverstockEntries[0][0].replace(/\s*Reactive\s*/gi, '').trim()).replace(/[™®©]/g, '').trim(); // e.g. "HVH Reactive"
            const coverstockFinish = (coverstockEntries[1][1] + ' ' +  coverstockEntries[1][0].replace(/\s*Grit\s*/gi, '').trim()).replace(/[™®©]/g, '').trim(); // e.g. "Grit LSS"

            var finishNumber = functions.finishNametoNumber(coverstockFinish, coverstockName);
            console.log(`${seriesName}\nCSN : ${coverstockName}, CFN : ${coverstockFinish},\nRG: ${RG} DIFF: ${DIFF}, MBDIFF : ${MBDIFF},finish : ${finishNumber}`);

            bowlingBall  = {rg:RG,diff:DIFF, mb_diff:MBDIFF, factory_finish:finishNumber};
            const  {hookPot, eVL, sVA} = test (bowlingBall);

            // Ball motion
            const { Length, Backend, Hook } = spec['BALL MOTION'];

            const row = `${seriesName},${spec['ball_name']},${coverstockName},${coverstockFinish},${weight},${RG},${DIFF},${MBDIFF},${finishNumber},${Length},${Backend},${Hook},${eVL},${sVA},${hookPot}\n`;
            fs.appendFileSync('output.csv', row);
            
        }
    }

}

// test({rg:2.48, diff:.054, mb_diff:0.019, factory_finish:8000});
// test({rg:2.44, diff:.005, mb_diff:0.0, factory_finish:8000});
// test({rg:2.44, diff:.062, mb_diff:0.0, factory_finish:8000});
// test({rg:2.44, diff:.062, mb_diff:0.037, factory_finish:8000});
// test({rg:2.75, diff:.005, mb_diff:0.0, factory_finish:8000});
// test({rg:2.75, diff:.062, mb_diff:0.0, factory_finish:8000});
// test({rg:2.75, diff:.062, mb_diff:0.037, factory_finish:8000});
// test({rg:2.44, diff:.005, mb_diff:0.0, factory_finish:360});
// test({rg:2.44, diff:.062, mb_diff:0.0, factory_finish:360});
// test({rg:2.44, diff:.062, mb_diff:0.037, factory_finish:360});
// test({rg:2.75, diff:.005, mb_diff:0.0, factory_finish:360});
// test({rg:2.75, diff:.062, mb_diff:0.0, factory_finish:360});
// test({rg:2.75, diff:.062, mb_diff:0.037, factory_finish:360});


// test2("500/1000/2000 sanded", "Polyester");
// test2("500/1000/2000 sanded", "Plastic");
// test2("6000 LSP", "Real");
// test2("2000 LSS", "Real");
// test2("500/1000/2000 sanded", "Real");
// test2("4K Fast", "Real");
// test2("10,000 Polished", "Real");
// test2("Reacta Gloss", "Real");
// test2("360/1000 sanded", "Real");
// test2("500 sanded", "Real");
// test2("500/1500/3000 Siaair Micro Pad", "Real");
// test2("NEAT A 2500 Grit", "Real");
// test2("500 abralon, 1500 abranet", "Real");
// test2("800 Abranet, 1000/2000/3000 Abralon", "Real");
// test2("800/1000/2000/4000 Abralon, Powerhouse Factory Finish", "Real");
// test2("500/500/1000 Abralon", "Real");

testingWorkFlow();