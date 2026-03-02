const functions = require("./backend/algorithms/bowlingBallScoreAlgos")

function test(bowlingBall) {
    
    var hookPot = functions.hookPotential(bowlingBall);
    var eVL = functions.earlyVLate(bowlingBall);
    var sVA = functions.smoothVAngular(bowlingBall);
    
    console.log("hook potential: ", hookPot)
    console.log("early-late score: ", eVL)
    console.log("smooth-angular score: ", sVA)
    console.log("---------------------------------------")
}

function test2(bowlingBallFinishName, bowlingBallCoverstockName) {
    
    var finishNumber = functions.finishNametoNumber(bowlingBallFinishName, bowlingBallCoverstockName);
    
    console.log("finishNumber: ", finishNumber)
    console.log("---------------------------------------")
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
test2("500/1500/3000 Siaair Micro Pad", "Real");
test2("NEAT A 2500 Grit", "Real");
test2("500 abralon, 1500 abranet", "Real");
test2("800 Abranet, 1000/2000/3000 Abralon", "Real");
test2("800/1000/2000/4000 Abralon, Powerhouse Factory Finish", "Real");
test2("500/500/1000 Abralon", "Real");
