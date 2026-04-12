/*
Copyright 2026 - All Rights Reserved
*/

//diff: (0 to .062)
//mass diff: (0 to 0.037)
//rg: (2.44 to 2.75)
//surface number: 180,360,500,1000,1500,2000,3000,4000,polish

var minDiff     = 0.005;
var maxDiff     = 0.062;
var minMBDiff   = 0.000;
var maxMBDiff   = 0.037;
var minRG       = 2.44;
var maxRG       = 2.75;




/**
 * Calculates the hook potential value of a given bowling ball on a scale of 0 to 100
 * @param {{rg:number, diff:number, mb_diff:number, factory_finish:number}} bowlingBall - Contents of a bowling ball
 * @returns {number} The calculated hook potential value
 */
function hookPotential(bowlingBall) {
    //higher diff = more hook
    //higher mass diff = more hook
    //lower surface number = slightly more hook
    //lower rg = more hook
    var rg = bowlingBall.rg;
    var diff = bowlingBall.diff;
    var mb_diff = bowlingBall.mb_diff;
    var finish = bowlingBall.factory_finish;

    if(bowlingBall.factory_finish===90000){
        return 0;
    }

    var value = -100.818184*rg - diff*(-620.80273 + 0.13826086/(2*diff - 0.08105743)) - 2.4139392*mb_diff*(-151.77776 + 0.612021/(47.6858850638557*mb_diff - 0.7534221)) + (2.7631378 - 68.8003489553699*diff)*Math.sin(rg*Math.sin(23.810516*rg)) + Math.sin((diff - 0.04468481)*(0.015476528*finish - 75.91627)) - Math.sin(76.65553*finish + 11.2662886113582)*Math.sin(0.78903574*Math.exp(rg)) + 310.478920949069 + (1003.1534 - finish)*(0.00138667656199061*finish - 8.025884 + 6476.659/finish)/finish

    return value/1.34;

}

/**
 * Calculates how fast a ball picks up for a given bowling ball on a scale of 0 to 100 where 0 is ultra early and 100 is ultra late
 * @param {{rg:number, diff:number, mb_diff:number, factory_finish:number}} bowlingBall - Contents of a bowling ball
 * @returns {number} The calculated length
 */
function earlyVLate(bowlingBall) {
    //lower rg = earlier
    //lower surface number = earlier
    //higher mass diff = earlier
    //higher diff = tiny bit earlier

    var rg = bowlingBall.rg;
    var diff = bowlingBall.diff;
    var mb_diff = bowlingBall.mb_diff;
    var finish = bowlingBall.factory_finish;

    if(bowlingBall.factory_finish===90000){
        return 0;
    }

    var value = -6.47374266160808*rg*(rg - 2.6206777)*(40.24794*rg - 102.008559443964) + 3.8247962*diff/(diff - 0.008874497) + mb_diff/(23.5564009150368*mb_diff - 0.437239903099248) + 0.0016090363*finish - (62666.91*mb_diff**2/(sin(605.0254*mb_diff) + 1.977454) - 3.2504096)*sin(2.1269627*sin(3.469686*finish)) + 7.372996*sin(4538.579*mb_diff*(mb_diff - 0.007848568)*(sin(exp(rg)) + 0.28085837)) + 62.4810893192692 + 0.082332864/(rg - 2.6865366) + sin(17.5679517834212*diff - 0.6231852)/(0.07006618 - sin(0.16966921*finish)) - 20341.42/finish - 0.201301930851112/diff
    return value;
}

/**
 * Calculates how angular a given bowling ball is on a scale of 0 to 100 where 0 is ultra smooth and 100 is ultra angular
 * @param {{rg:number, diff:number, mb_diff:number, factory_finish:number}} bowlingBall - Contents of a bowling ball
 * @returns {number} The calculated backend
 */
function smoothVAngular(bowlingBall) {
    //higher rg = smoother
    //lower diff = smoother
    //lower mass diff = smoother
    //lower surface number = smoother

    var rg = bowlingBall.rg;
    var diff = bowlingBall.diff;
    var mb_diff = bowlingBall.mb_diff;
    var finish = bowlingBall.factory_finish;

    if(bowlingBall.factory_finish===90000){
        return 0;
    }

    var value = 38.864967*rg - 120.41707*diff + mb_diff**2*finish/(sin(2*finish) - 0.30317035) - 26727.46*mb_diff*(0.6001752 - sin(rg))*(rg - 2.8211472)*sin(136.74153*mb_diff - 1.1881695) - 53.6438007641345*mb_diff*(478.58905056212*mb_diff - 8.92158189187496) - mb_diff - 3.84479141255288 - 733.2708/(finish - 2355.4263) + 0.002088377/(mb_diff - 0.018642792) + 0.893783/(37.864967*rg - 99.208786) + 7.7535615*(2.7794487*finish - 4235.434)/finish + 8319183.0*sin(1.5752895 + 0.049962416/diff)/finish**2 + (-1.1900324 + 0.008265728/diff)/diff
    return value;
}

/**
 * Calculates how angular a given bowling ball is on a scale of 0 to 9000 where 0 is ultra smooth and 100 is ultra angular
 * @param {string, string} bowlingBallFinishName - Contents of a bowling ball
 * @returns {number} The calculated hook potential value
 */
function finishNametoNumber(bowlingBallFinishName, bowlingBallCoverstockName) {
    if(
        bowlingBallCoverstockName.toLowerCase().includes("polyester")||
        bowlingBallCoverstockName.toLowerCase().includes("polythane")||
        bowlingBallCoverstockName.toLowerCase().includes("plastic")
    ){
        return 90000;
    }


    //assuming coverstock is not polyester/plastic/a spare ball
    bowlingBallFinishName = bowlingBallFinishName.toLowerCase().replace("35 micron","330") //35 micron one off
    bowlingBallFinishName = bowlingBallFinishName.replace("4k","4000") //4k fast one off
    // const lastNumberRegex = /\d+[^d]*$/;
    // const match = bowlingBallFinishName.match(lastNumberRegex);
    const lastDigitIndex = bowlingBallFinishName.lastIndexOf(bowlingBallFinishName.split("").reverse().find(char => /\d/.test(char)));

    var splitString;
    if (lastDigitIndex!=-1) {
    const lastNumberIndex = lastDigitIndex+1;
    const partBefore = bowlingBallFinishName.substring(0, lastNumberIndex);
    const partAfter = bowlingBallFinishName.substring(lastNumberIndex);

    splitString = [partBefore, partAfter];
    } else {
        // If no number is found, return the original string in an array
        splitString  = [bowlingBallFinishName];
    }
    if(splitString.length==1){
        return 9000;
    }
    // console.log("splitString: ", splitString)
    const polished = 
        splitString[1].toLowerCase().includes("polish") || 
        splitString[1].toLowerCase().includes("gloss") || 
        splitString[1].toLowerCase().includes("lsp") || 
        splitString[1].toLowerCase().includes("shine") || 
        splitString[1].toLowerCase().includes("factory finish")

    const numbersTruncated = splitString[0].replaceAll(",","").replaceAll("/"," ");
    const splitNumberBySpace = numbersTruncated.split(" ");
    // console.log("splitNumberBySpace: ", splitNumberBySpace)
    const regex = /\d/;
    for(var i=0;i<splitNumberBySpace.length;i+0){
        if(regex.test(splitNumberBySpace[i])){
            i++;
        }
        else{
            splitNumberBySpace.splice(i,1);
        }
    }

    var value = 0;
    var firstPass = true;
    for(var i=splitNumberBySpace.length-1;i>=0;i--){
        if(firstPass){
            value = splitNumberBySpace[i];
            firstPass = false;
        }
        else{
            value = value - splitNumberBySpace[i]*.1*(splitNumberBySpace.length-1-i)
        }
    }
    if(polished){
        value = value + 5000;
        value = Math.min(9000, value);
    }
    return value;
}

module.exports = {hookPotential, earlyVLate, smoothVAngular, finishNametoNumber}