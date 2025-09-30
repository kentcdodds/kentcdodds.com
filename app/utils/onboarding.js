"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEAM_SKIING_MAP = exports.TEAM_ONEWHEELING_MAP = exports.TEAM_SNOWBOARD_MAP = exports.TEAM_MAP = void 0;
var images_tsx_1 = require("#app/images.tsx");
exports.TEAM_MAP = {
    BLUE: {
        image: function () { return (0, images_tsx_1.getRandomSportyKody)('BLUE'); },
        label: 'Blue Team',
        focusClassName: 'ring-team-blue',
    },
    RED: {
        image: function () { return (0, images_tsx_1.getRandomSportyKody)('RED'); },
        label: 'Red Team',
        focusClassName: 'ring-team-red',
    },
    YELLOW: {
        image: function () { return (0, images_tsx_1.getRandomSportyKody)('YELLOW'); },
        label: 'Yellow Team',
        focusClassName: 'ring-team-yellow',
    },
};
exports.TEAM_SNOWBOARD_MAP = {
    BLUE: {
        image: images_tsx_1.images.kodySnowboardingBlue,
        label: 'Blue Team',
        focusClassName: 'ring-team-blue',
    },
    RED: {
        image: images_tsx_1.images.kodySnowboardingRed,
        label: 'Red Team',
        focusClassName: 'ring-team-red',
    },
    YELLOW: {
        image: images_tsx_1.images.kodySnowboardingYellow,
        label: 'Yellow Team',
        focusClassName: 'ring-team-yellow',
    },
};
exports.TEAM_ONEWHEELING_MAP = {
    BLUE: {
        image: images_tsx_1.images.kodyOnewheelingBlue,
        label: 'Blue Team',
        focusClassName: 'ring-team-blue',
    },
    RED: {
        image: images_tsx_1.images.kodyOnewheelingRed,
        label: 'Red Team',
        focusClassName: 'ring-team-red',
    },
    YELLOW: {
        image: images_tsx_1.images.kodyOnewheelingYellow,
        label: 'Yellow Team',
        focusClassName: 'ring-team-yellow',
    },
};
exports.TEAM_SKIING_MAP = {
    BLUE: {
        image: images_tsx_1.images.kodySkiingBlue,
        label: 'Blue Team',
        focusClassName: 'ring-team-blue',
    },
    RED: {
        image: images_tsx_1.images.kodySkiingRed,
        label: 'Red Team',
        focusClassName: 'ring-team-red',
    },
    YELLOW: {
        image: images_tsx_1.images.kodySkiingYellow,
        label: 'Yellow Team',
        focusClassName: 'ring-team-yellow',
    },
};
