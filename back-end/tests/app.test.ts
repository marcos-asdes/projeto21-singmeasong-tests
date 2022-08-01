import { faker } from "@faker-js/faker";
import supertest from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/database.js";

// Environment variables
const NAME: string = faker.internet.userName();
const LINK: string = "https://www.youtube.com/watch?v=5NV6Rdv1a3I";
const route: string = "/recommendations";
const voidBody: object = {};

// Clean test database
beforeEach(async() => {
    await prisma.$transaction([
        prisma.$executeRaw`TRUNCATE TABLE recommendations`
    ]);
});

// Auxiliary functions
async function post(body: object, route: string) {
    const response = await supertest(app).post(route).send(body);
    return response;
}

async function postBody(route: string) {
    const body = { name: NAME, youtubeLink: LINK };
    const response = await post(body, route);
    return response;
}

async function check(){
    const check = await prisma.recommendation.findUnique({
        where: { name: NAME }
    });
    return check;
}

async function createRecommendation() {
    await postBody(route);
    const recommendation = await check();
    return recommendation;
}

// Integration tests
describe ("Test suite: method post - route recommendations/", () => {

    it ("given a name as string and a youtube link as string, execute a post, expect success", async () =>  {
        const response = await postBody(route);
        expect(response.status).toEqual(201);
    });

    it ("given a name as number and a youtube link as string, execute a post, expect failure", async () => {
        const name: number = Math.random()*100;
        const body = { name: name, youtubeLink: LINK };
        const response = await post(body, route);
        expect(response.status).toEqual(422);
    });

    it ("given a name as string and a random link as string, execute a post, expect failure", async () => {
        const link: string = "https://www.google.com";
        const body = { name: NAME, youtubeLink: link };
        const response = await post(body, route);
        expect(response.status).toEqual(422);
    });

    it ("checks if the data passed in the body creates a record in the database, expect success", async () => {
        const recommendation = await createRecommendation();
        expect(recommendation).not.toBeNull();
        expect(recommendation).not.toBeUndefined();
    });
});

describe ("Test suite: method post - route recommendations/:id/upvote", () => {

    it ("add one vote, expect success", async () => {
        const recommendation = await createRecommendation();
        const upvoteRoute: string = `/recommendations/${recommendation.id}/upvote`;
        const response = await post(voidBody, upvoteRoute);
        expect(response.status).toEqual(200);
    });

    it ("add one vote on an id that doesn't exist, expect failure", async () => {
        const recommendation = await createRecommendation();
        const upvoteRoute: string = `/recommendations/${recommendation.id}/upvote`;
        await prisma.recommendation.delete({
            where: { name: NAME }
        });
        const response = await post(voidBody, upvoteRoute);
        expect(response.status).toEqual(404);
    });

    it("checks if the operation adds only one vote to the database, expect success", async () => {
        const recommendation = await createRecommendation();
        const upvoteRoute: string = `/recommendations/${recommendation.id}/upvote`;
        await post(voidBody, upvoteRoute);
        const newCheck = await check();
        expect(recommendation.score+1).toEqual(newCheck.score);
    });

    it("double check of previous operation, expect success", async () => {
        const recommendation = await createRecommendation();
        const upvoteRoute: string = `/recommendations/${recommendation.id}/upvote`;
        await post(voidBody, upvoteRoute);
        const newCheck = await check();
        expect(recommendation.score).toEqual(newCheck.score-1);
    });
});

describe ("Test suite: method post - route recommendations/:id/downvote", () => {

    it("decrease one vote, expect success", async () => {
        const recommendation = await createRecommendation();
        const downvoteRoute: string = `/recommendations/${recommendation.id}/downvote`;
        const response = await post(voidBody, downvoteRoute);
        expect(response.status).toEqual(200);
    });

    it("checks if the operation downgrades only one vote to the database, expect success", async () => {
        const recommendation = await createRecommendation();
        const downvoteRoute: string = `/recommendations/${recommendation.id}/downvote`;
        await post(voidBody, downvoteRoute);
        const newCheck = await check();
        expect(recommendation.score-1).toEqual(newCheck.score);
    });

    it("double check of previous operation, expect success", async () => {
        const recommendation = await createRecommendation();
        const downvoteRoute: string = `/recommendations/${recommendation.id}/downvote`;
        await post(voidBody, downvoteRoute);
        const newCheck = await check();
        expect(recommendation.score).toEqual(newCheck.score+1);
    });

    it("decrease one vote on an id that doesn't exist, expect failure", async () => {
        const recommendation = await createRecommendation();
        const downvoteRoute: string = `/recommendations/${recommendation.id}/downvote`;
        await prisma.recommendation.delete({
            where: { name: NAME }
        });
        const response = await post(voidBody, downvoteRoute);
        expect(response.status).toEqual(404);
    });

    it("check if the recommendation is deleted when it drops below -5 votes, expect success", async () => {
        const recommendation = await createRecommendation();
        const downvoteRoute: string = `/recommendations/${recommendation.id}/downvote`;
        await prisma.recommendation.update({
            where: { id: recommendation.id },
            data: {
                score: -5,
            },
        });
        await post(voidBody, downvoteRoute);
        const newCheck = await check();
        expect(newCheck).toBeNull();
    });
});

