"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
var faker_1 = require("@faker-js/faker");
function createUser() {
    var gender = faker_1.faker.helpers.arrayElement(['female', 'male']);
    var firstName = faker_1.faker.person.firstName(gender);
    var username = faker_1.faker.internet.userName({ firstName: firstName }).toLowerCase();
    return {
        firstName: firstName,
        email: "".concat(username, "@example.com"),
        kitId: null,
        discordId: null,
        role: 'USER',
        team: faker_1.faker.helpers.arrayElement(['BLUE', 'RED', 'YELLOW']),
    };
}
