module.exports = {
    moduleFileExtensions: [
        "ts",
        "js",
        "json"
    ],
    moduleDirectories: ["node_modules", "src"],
    rootDir: "test",
    testRegex: "\.test.ts$",
    transform: {
        "^.+\\.(t|j)s$": "ts-jest"
    },
    collectCoverageFrom: [
        "**/*.(t|j)s"
    ],
    coverageDirectory: "../coverage",
    testEnvironment: "node",
    moduleNameMapper: {
    }
};