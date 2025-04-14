'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineBreaker = exports.inlineBreakOpportunities = exports.lineBreakAtIndex = exports.codePointsToCharacterClasses = exports.UnicodeTrie = exports.BREAK_ALLOWED = exports.BREAK_NOT_ALLOWED = exports.BREAK_MANDATORY = exports.classes = exports.LETTER_NUMBER_MODIFIER = void 0;
const utrie_1 = require("utrie");
const linebreak_trie_1 = require("./linebreak-trie");
const Util_1 = require("./Util");
exports.LETTER_NUMBER_MODIFIER = 50;
// Non-tailorable Line Breaking Classes
const BK = 1; //  Cause a line break (after)
const CR = 2; //  Cause a line break (after), except between CR and LF
const LF = 3; //  Cause a line break (after)
const CM = 4; //  Prohibit a line break between the character and the preceding character
const NL = 5; //  Cause a line break (after)
const SG = 6; //  Do not occur in well-formed text
const WJ = 7; //  Prohibit line breaks before and after
const ZW = 8; //  Provide a break opportunity
const GL = 9; //  Prohibit line breaks before and after
const SP = 10; // Enable indirect line breaks
const ZWJ = 11; // Prohibit line breaks within joiner sequences
// Break Opportunities
const B2 = 12; //  Provide a line break opportunity before and after the character
const BA = 13; //  Generally provide a line break opportunity after the character
const BB = 14; //  Generally provide a line break opportunity before the character
const HY = 15; //  Provide a line break opportunity after the character, except in numeric context
const CB = 16; //   Provide a line break opportunity contingent on additional information
// Characters Prohibiting Certain Breaks
const CL = 17; //  Prohibit line breaks before
const CP = 18; //  Prohibit line breaks before
const EX = 19; //  Prohibit line breaks before
const IN = 20; //  Allow only indirect line breaks between pairs
const NS = 21; //  Allow only indirect line breaks before
const OP = 22; //  Prohibit line breaks after
const QU = 23; //  Act like they are both opening and closing
// Numeric Context
const IS = 24; //  Prevent breaks after any and before numeric
const NU = 25; //  Form numeric expressions for line breaking purposes
const PO = 26; //  Do not break following a numeric expression
const PR = 27; //  Do not break in front of a numeric expression
const SY = 28; //  Prevent a break before; and allow a break after
// Other Characters
const AI = 29; //  Act like AL when the resolvedEAW is N; otherwise; act as ID
const AL = 30; //  Are alphabetic characters or symbols that are used with alphabetic characters
const CJ = 31; //  Treat as NS or ID for strict or normal breaking.
const EB = 32; //  Do not break from following Emoji Modifier
const EM = 33; //  Do not break from preceding Emoji Base
const H2 = 34; //  Form Korean syllable blocks
const H3 = 35; //  Form Korean syllable blocks
const HL = 36; //  Do not break around a following hyphen; otherwise act as Alphabetic
const ID = 37; //  Break before or after; except in some numeric context
const JL = 38; //  Form Korean syllable blocks
const JV = 39; //  Form Korean syllable blocks
const JT = 40; //  Form Korean syllable blocks
const RI = 41; //  Keep pairs together. For pairs; break before and after other classes
const SA = 42; //  Provide a line break opportunity contingent on additional, language-specific context analysis
const XX = 43; //  Have as yet unknown line breaking behavior or unassigned code positions
const ea_OP = [0x2329, 0xff08];
exports.classes = {
    BK,
    CR,
    LF,
    CM,
    NL,
    SG,
    WJ,
    ZW,
    GL,
    SP,
    ZWJ,
    B2,
    BA,
    BB,
    HY,
    CB,
    CL,
    CP,
    EX,
    IN,
    NS,
    OP,
    QU,
    IS,
    NU,
    PO,
    PR,
    SY,
    AI,
    AL,
    CJ,
    EB,
    EM,
    H2,
    H3,
    HL,
    ID,
    JL,
    JV,
    JT,
    RI,
    SA,
    XX,
};
exports.BREAK_MANDATORY = '!';
exports.BREAK_NOT_ALLOWED = '×';
exports.BREAK_ALLOWED = '÷';
exports.UnicodeTrie = (0, utrie_1.createTrieFromBase64)(linebreak_trie_1.base64, linebreak_trie_1.byteLength);
const ALPHABETICS = [AL, HL];
const HARD_LINE_BREAKS = [BK, CR, LF, NL];
const SPACE = [SP, ZW];
const PREFIX_POSTFIX = [PR, PO];
const LINE_BREAKS = HARD_LINE_BREAKS.concat(SPACE);
const KOREAN_SYLLABLE_BLOCK = [JL, JV, JT, H2, H3];
const HYPHEN = [HY, BA];
const codePointsToCharacterClasses = (codePoints, lineBreak = 'strict') => {
    const types = [];
    const indices = [];
    const categories = [];
    codePoints.forEach((codePoint, index) => {
        let classType = exports.UnicodeTrie.get(codePoint);
        if (classType > exports.LETTER_NUMBER_MODIFIER) {
            categories.push(true);
            classType -= exports.LETTER_NUMBER_MODIFIER;
        }
        else {
            categories.push(false);
        }
        if (['normal', 'auto', 'loose'].indexOf(lineBreak) !== -1) {
            // U+2010, – U+2013, 〜 U+301C, ゠ U+30A0
            if ([0x2010, 0x2013, 0x301c, 0x30a0].indexOf(codePoint) !== -1) {
                indices.push(index);
                return types.push(CB);
            }
        }
        if (classType === CM || classType === ZWJ) {
            // LB10 Treat any remaining combining mark or ZWJ as AL.
            if (index === 0) {
                indices.push(index);
                return types.push(AL);
            }
            // LB9 Do not break a combining character sequence; treat it as if it has the line breaking class of
            // the base character in all of the following rules. Treat ZWJ as if it were CM.
            const prev = types[index - 1];
            if (LINE_BREAKS.indexOf(prev) === -1) {
                indices.push(indices[index - 1]);
                return types.push(prev);
            }
            indices.push(index);
            return types.push(AL);
        }
        indices.push(index);
        if (classType === CJ) {
            return types.push(lineBreak === 'strict' ? NS : ID);
        }
        if (classType === SA) {
            return types.push(AL);
        }
        if (classType === AI) {
            return types.push(AL);
        }
        // For supplementary characters, a useful default is to treat characters in the range 10000..1FFFD as AL
        // and characters in the ranges 20000..2FFFD and 30000..3FFFD as ID, until the implementation can be revised
        // to take into account the actual line breaking properties for these characters.
        if (classType === XX) {
            if ((codePoint >= 0x20000 && codePoint <= 0x2fffd) || (codePoint >= 0x30000 && codePoint <= 0x3fffd)) {
                return types.push(ID);
            }
            else {
                return types.push(AL);
            }
        }
        types.push(classType);
    });
    return [indices, types, categories];
};
exports.codePointsToCharacterClasses = codePointsToCharacterClasses;
const isAdjacentWithSpaceIgnored = (a, b, currentIndex, classTypes) => {
    const current = classTypes[currentIndex];
    if (Array.isArray(a) ? a.indexOf(current) !== -1 : a === current) {
        let i = currentIndex;
        while (i <= classTypes.length) {
            i++;
            let next = classTypes[i];
            if (next === b) {
                return true;
            }
            if (next !== SP) {
                break;
            }
        }
    }
    if (current === SP) {
        let i = currentIndex;
        while (i > 0) {
            i--;
            const prev = classTypes[i];
            if (Array.isArray(a) ? a.indexOf(prev) !== -1 : a === prev) {
                let n = currentIndex;
                while (n <= classTypes.length) {
                    n++;
                    let next = classTypes[n];
                    if (next === b) {
                        return true;
                    }
                    if (next !== SP) {
                        break;
                    }
                }
            }
            if (prev !== SP) {
                break;
            }
        }
    }
    return false;
};
const previousNonSpaceClassType = (currentIndex, classTypes) => {
    let i = currentIndex;
    while (i >= 0) {
        let type = classTypes[i];
        if (type === SP) {
            i--;
        }
        else {
            return type;
        }
    }
    return 0;
};
const _lineBreakAtIndex = (codePoints, classTypes, indicies, index, forbiddenBreaks) => {
    if (indicies[index] === 0) {
        return exports.BREAK_NOT_ALLOWED;
    }
    let currentIndex = index - 1;
    if (Array.isArray(forbiddenBreaks) && forbiddenBreaks[currentIndex] === true) {
        return exports.BREAK_NOT_ALLOWED;
    }
    let beforeIndex = currentIndex - 1;
    let afterIndex = currentIndex + 1;
    let current = classTypes[currentIndex];
    // LB4 Always break after hard line breaks.
    // LB5 Treat CR followed by LF, as well as CR, LF, and NL as hard line breaks.
    let before = beforeIndex >= 0 ? classTypes[beforeIndex] : 0;
    let next = classTypes[afterIndex];
    if (current === CR && next === LF) {
        return exports.BREAK_NOT_ALLOWED;
    }
    if (HARD_LINE_BREAKS.indexOf(current) !== -1) {
        return exports.BREAK_MANDATORY;
    }
    // LB6 Do not break before hard line breaks.
    if (HARD_LINE_BREAKS.indexOf(next) !== -1) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB7 Do not break before spaces or zero width space.
    if (SPACE.indexOf(next) !== -1) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB8 Break before any character following a zero-width space, even if one or more spaces intervene.
    if (previousNonSpaceClassType(currentIndex, classTypes) === ZW) {
        return exports.BREAK_ALLOWED;
    }
    // LB8a Do not break after a zero width joiner.
    if (exports.UnicodeTrie.get(codePoints[currentIndex]) === ZWJ) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // zwj emojis
    if ((current === EB || current === EM) && exports.UnicodeTrie.get(codePoints[afterIndex]) === ZWJ) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB11 Do not break before or after Word joiner and related characters.
    if (current === WJ || next === WJ) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB12 Do not break after NBSP and related characters.
    if (current === GL) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB12a Do not break before NBSP and related characters, except after spaces and hyphens.
    if ([SP, BA, HY].indexOf(current) === -1 && next === GL) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB13 Do not break before ‘]’ or ‘!’ or ‘;’ or ‘/’, even after spaces.
    if ([CL, CP, EX, IS, SY].indexOf(next) !== -1) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB14 Do not break after ‘[’, even after spaces.
    if (previousNonSpaceClassType(currentIndex, classTypes) === OP) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB15 Do not break within ‘”[’, even with intervening spaces.
    if (isAdjacentWithSpaceIgnored(QU, OP, currentIndex, classTypes)) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB16 Do not break between closing punctuation and a nonstarter (lb=NS), even with intervening spaces.
    if (isAdjacentWithSpaceIgnored([CL, CP], NS, currentIndex, classTypes)) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB17 Do not break within ‘——’, even with intervening spaces.
    if (isAdjacentWithSpaceIgnored(B2, B2, currentIndex, classTypes)) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB18 Break after spaces.
    if (current === SP) {
        return exports.BREAK_ALLOWED;
    }
    // LB19 Do not break before or after quotation marks, such as ‘ ” ’.
    if (current === QU || next === QU) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB20 Break before and after unresolved CB.
    if (next === CB || current === CB) {
        return exports.BREAK_ALLOWED;
    }
    // LB21 Do not break before hyphen-minus, other hyphens, fixed-width spaces, small kana, and other non-starters, or after acute accents.
    if ([BA, HY, NS].indexOf(next) !== -1 || current === BB) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB21a Don't break after Hebrew + Hyphen.
    if (before === HL && HYPHEN.indexOf(current) !== -1) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB21b Don’t break between Solidus and Hebrew letters.
    if (current === SY && next === HL) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB22 Do not break before ellipsis.
    if (next === IN) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB23 Do not break between digits and letters.
    if ((ALPHABETICS.indexOf(next) !== -1 && current === NU) || (ALPHABETICS.indexOf(current) !== -1 && next === NU)) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB23a Do not break between numeric prefixes and ideographs, or between ideographs and numeric postfixes.
    if ((current === PR && [ID, EB, EM].indexOf(next) !== -1) ||
        ([ID, EB, EM].indexOf(current) !== -1 && next === PO)) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB24 Do not break between numeric prefix/postfix and letters, or between letters and prefix/postfix.
    if ((ALPHABETICS.indexOf(current) !== -1 && PREFIX_POSTFIX.indexOf(next) !== -1) ||
        (PREFIX_POSTFIX.indexOf(current) !== -1 && ALPHABETICS.indexOf(next) !== -1)) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB25 Do not break between the following pairs of classes relevant to numbers:
    if (
    // (PR | PO) × ( OP | HY )? NU
    ([PR, PO].indexOf(current) !== -1 &&
        (next === NU || ([OP, HY].indexOf(next) !== -1 && classTypes[afterIndex + 1] === NU))) ||
        // ( OP | HY ) × NU
        ([OP, HY].indexOf(current) !== -1 && next === NU) ||
        // NU ×	(NU | SY | IS)
        (current === NU && [NU, SY, IS].indexOf(next) !== -1)) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // NU (NU | SY | IS)* × (NU | SY | IS | CL | CP)
    if ([NU, SY, IS, CL, CP].indexOf(next) !== -1) {
        let prevIndex = currentIndex;
        while (prevIndex >= 0) {
            let type = classTypes[prevIndex];
            if (type === NU) {
                return exports.BREAK_NOT_ALLOWED;
            }
            else if ([SY, IS].indexOf(type) !== -1) {
                prevIndex--;
            }
            else {
                break;
            }
        }
    }
    // NU (NU | SY | IS)* (CL | CP)? × (PO | PR))
    if ([PR, PO].indexOf(next) !== -1) {
        let prevIndex = [CL, CP].indexOf(current) !== -1 ? beforeIndex : currentIndex;
        while (prevIndex >= 0) {
            let type = classTypes[prevIndex];
            if (type === NU) {
                return exports.BREAK_NOT_ALLOWED;
            }
            else if ([SY, IS].indexOf(type) !== -1) {
                prevIndex--;
            }
            else {
                break;
            }
        }
    }
    // LB26 Do not break a Korean syllable.
    if ((JL === current && [JL, JV, H2, H3].indexOf(next) !== -1) ||
        ([JV, H2].indexOf(current) !== -1 && [JV, JT].indexOf(next) !== -1) ||
        ([JT, H3].indexOf(current) !== -1 && next === JT)) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB27 Treat a Korean Syllable Block the same as ID.
    if ((KOREAN_SYLLABLE_BLOCK.indexOf(current) !== -1 && [IN, PO].indexOf(next) !== -1) ||
        (KOREAN_SYLLABLE_BLOCK.indexOf(next) !== -1 && current === PR)) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB28 Do not break between alphabetics (“at”).
    if (ALPHABETICS.indexOf(current) !== -1 && ALPHABETICS.indexOf(next) !== -1) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB29 Do not break between numeric punctuation and alphabetics (“e.g.”).
    if (current === IS && ALPHABETICS.indexOf(next) !== -1) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB30 Do not break between letters, numbers, or ordinary symbols and opening or closing parentheses.
    if ((ALPHABETICS.concat(NU).indexOf(current) !== -1 &&
        next === OP &&
        ea_OP.indexOf(codePoints[afterIndex]) === -1) ||
        (ALPHABETICS.concat(NU).indexOf(next) !== -1 && current === CP)) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB30a Break between two regional indicator symbols if and only if there are an even number of regional
    // indicators preceding the position of the break.
    if (current === RI && next === RI) {
        let i = indicies[currentIndex];
        let count = 1;
        while (i > 0) {
            i--;
            if (classTypes[i] === RI) {
                count++;
            }
            else {
                break;
            }
        }
        if (count % 2 !== 0) {
            return exports.BREAK_NOT_ALLOWED;
        }
    }
    // LB30b Do not break between an emoji base and an emoji modifier.
    if (current === EB && next === EM) {
        return exports.BREAK_NOT_ALLOWED;
    }
    return exports.BREAK_ALLOWED;
};
const lineBreakAtIndex = (codePoints, index) => {
    // LB2 Never break at the start of text.
    if (index === 0) {
        return exports.BREAK_NOT_ALLOWED;
    }
    // LB3 Always break at the end of text.
    if (index >= codePoints.length) {
        return exports.BREAK_MANDATORY;
    }
    const [indices, classTypes] = (0, exports.codePointsToCharacterClasses)(codePoints);
    return _lineBreakAtIndex(codePoints, classTypes, indices, index);
};
exports.lineBreakAtIndex = lineBreakAtIndex;
const cssFormattedClasses = (codePoints, options) => {
    if (!options) {
        options = { lineBreak: 'normal', wordBreak: 'normal' };
    }
    let [indicies, classTypes, isLetterNumber] = (0, exports.codePointsToCharacterClasses)(codePoints, options.lineBreak);
    if (options.wordBreak === 'break-all' || options.wordBreak === 'break-word') {
        classTypes = classTypes.map((type) => ([NU, AL, SA].indexOf(type) !== -1 ? ID : type));
    }
    const forbiddenBreakpoints = options.wordBreak === 'keep-all'
        ? isLetterNumber.map((letterNumber, i) => {
            return letterNumber && codePoints[i] >= 0x4e00 && codePoints[i] <= 0x9fff;
        })
        : undefined;
    return [indicies, classTypes, forbiddenBreakpoints];
};
const inlineBreakOpportunities = (str, options) => {
    const codePoints = (0, Util_1.toCodePoints)(str);
    let output = exports.BREAK_NOT_ALLOWED;
    const [indicies, classTypes, forbiddenBreakpoints] = cssFormattedClasses(codePoints, options);
    codePoints.forEach((codePoint, i) => {
        output +=
            (0, Util_1.fromCodePoint)(codePoint) +
                (i >= codePoints.length - 1
                    ? exports.BREAK_MANDATORY
                    : _lineBreakAtIndex(codePoints, classTypes, indicies, i + 1, forbiddenBreakpoints));
    });
    return output;
};
exports.inlineBreakOpportunities = inlineBreakOpportunities;
class Break {
    constructor(codePoints, lineBreak, start, end) {
        this.codePoints = codePoints;
        this.required = lineBreak === exports.BREAK_MANDATORY;
        this.start = start;
        this.end = end;
    }
    slice() {
        return (0, Util_1.fromCodePoint)(...this.codePoints.slice(this.start, this.end));
    }
}
const LineBreaker = (str, options) => {
    const codePoints = (0, Util_1.toCodePoints)(str);
    const [indicies, classTypes, forbiddenBreakpoints] = cssFormattedClasses(codePoints, options);
    const length = codePoints.length;
    let lastEnd = 0;
    let nextIndex = 0;
    return {
        next: () => {
            if (nextIndex >= length) {
                return { done: true, value: null };
            }
            let lineBreak = exports.BREAK_NOT_ALLOWED;
            while (nextIndex < length &&
                (lineBreak = _lineBreakAtIndex(codePoints, classTypes, indicies, ++nextIndex, forbiddenBreakpoints)) ===
                    exports.BREAK_NOT_ALLOWED) { }
            if (lineBreak !== exports.BREAK_NOT_ALLOWED || nextIndex === length) {
                const value = new Break(codePoints, lineBreak, lastEnd, nextIndex);
                lastEnd = nextIndex;
                return { value, done: false };
            }
            return { done: true, value: null };
        },
    };
};
exports.LineBreaker = LineBreaker;
//# sourceMappingURL=LineBreak.js.map