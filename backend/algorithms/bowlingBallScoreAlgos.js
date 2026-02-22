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

    var value = -100.818184*rg - diff*(-620.80273 + 0.13826086/(2*diff - 0.08105743)) - 2.4139392*mb_diff*(-151.77776 + 0.612021/(47.6858850638557*mb_diff - 0.7534221)) + (2.7631378 - 68.8003489553699*diff)*Math.sin(rg*Math.sin(23.810516*rg)) + Math.sin((diff - 0.04468481)*(0.015476528*finish - 75.91627)) - Math.sin(76.65553*finish + 11.2662886113582)*Math.sin(0.78903574*Math.exp(rg)) + 310.478920949069 + (1003.1534 - finish)*(0.00138667656199061*finish - 8.025884 + 6476.659/finish)/finish

    return value/1.34;

}

/**
 * Calculates how fast a ball picks up for a given bowling ball on a scale of 0 to 100 where 0 is ultra early and 100 is ultra late
 * @param {{rg:number, diff:number, mb_diff:number, factory_finish:number}} bowlingBall - Contents of a bowling ball
 * @returns {number} The calculated hook potential value
 */
function earlyVLate(bowlingBall) {
    //lower rg = earlier
    //lower surface number = earlier
    //higher mass diff = earlier
    //higher diff = tiny bit earlier

    var value = (bowlingBall.rg-minRG)*bowlingBall.factory_finish*(5**(1/(1-(bowlingBall.mb_diff-minMBDiff))))*(bowlingBall.diff-minDiff);
    return value;
}

/**
 * Calculates how angular a given bowling ball is on a scale of 0 to 100 where 0 is ultra smooth and 100 is ultra angular
 * @param {{rg:number, diff:number, mb_diff:number, factory_finish:number}} bowlingBall - Contents of a bowling ball
 * @returns {number} The calculated hook potential value
 */
function smoothVAngular(bowlingBall) {
    //higher rg = smoother
    //lower diff = smoother
    //lower mass diff = smoother
    //lower surface number = smoother

    var value = (maxRG-bowlingBall.rg)*(bowlingBall.diff-minDiff)*(5**(1/(1-(bowlingBall.mb_diff-minMBDiff))))*bowlingBall.factory_finish;
    return value;
}

module.exports = {hookPotential, earlyVLate, smoothVAngular}