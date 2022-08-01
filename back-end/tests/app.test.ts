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

async function createResult() {
    await postBody(route);
    const result = await check();
    return result;
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
        const result = await createResult();
        expect(result).not.toBeNull();
        expect(result).not.toBeUndefined();
    });
});

describe ("Test suite: method post - route recommendations/:id/upvote", () => {

    it ("add one vote, expect success", async () => {
        const result = await createResult();
        const upvoteRoute: string = `/recommendations/${result.id}/upvote`;
        const response = await post(voidBody, upvoteRoute);
        expect(response.status).toEqual(200);
    });

    it ("add a vote on an id that doesn't exist, expect failure", async () => {
        const result = await createResult();
        const upvoteRoute: string = `/recommendations/${result.id}/upvote`;
        await prisma.recommendation.delete({
            where: { name: NAME }
        });
        const response = await post(voidBody, upvoteRoute);
        expect(response.status).toEqual(404);
    });

    it("checks if the operation adds only one vote to the database, expect success", async () => {
        const result = await createResult();
        const upvoteRoute: string = `/recommendations/${result.id}/upvote`;
        await post(voidBody, upvoteRoute);
        const newResult = await check();
        expect(result.score+1).toEqual(newResult.score);
    });

    it("double check of previous operation, expect success", async () => {
        const result = await createResult();
        const upvoteRoute: string = `/recommendations/${result.id}/upvote`;
        await post(voidBody, upvoteRoute);
        const newResult = await check();
        expect(result.score).toEqual(newResult.score-1);
    });
});

describe ("Route recommendations/:id/downvote", () => {
    it("Checar se diminui 1 voto", async () => {
        const body = { name: NAME, youtubeLink: LINK };
        await supertest(app).post("/recommendations").send(body);
        const check = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        const { id } = check;
        const voidBody = {};
        const response = await supertest(app).post(`/recommendations/${id}/downvote`).send(voidBody);
        expect(response.status).toEqual(200);
    });

    it("Checar se em um downvote não diminui um número diferente de 1", async () => {
        const body = { name: NAME, youtubeLink: LINK };
        await supertest(app).post("/recommendations").send(body);
        const check = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        const { id } = check;
        const voidBody = {};
        await supertest(app).post(`/recommendations/${id}/downvote`).send(voidBody);
        const check2 = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        expect(check.score-1).toEqual(check2.score);
    });

    it("Checar no banco de dados se a operação está ok", async () => {
        const body = { name: NAME, youtubeLink: LINK };
        await supertest(app).post("/recommendations").send(body);
        const check = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        const { id } = check;
        const voidBody = {};
        await supertest(app).post(`/recommendations/${id}/downvote`).send(voidBody);
        const check2 = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        expect(check.score).toEqual(check2.score+1);
    });

    it("Checar se o downvote falha numa id q não existe", async () => {
        const body = { name: NAME, youtubeLink: LINK };
        await supertest(app).post("/recommendations").send(body);
        const check = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        const { id } = check;
        await prisma.recommendation.delete({
            where: { name: NAME }
        });
        const voidBody = {};
        const response = await supertest(app).post(`/recommendations/${id}/downvote`).send(voidBody);
        expect(response.status).toEqual(404);
    });

    it("Checar a recomendação é excluída abaixo de -5 votos", async () => {
        const body = { name: NAME, youtubeLink: LINK };
        await supertest(app).post("/recommendations").send(body);
        const check = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        await prisma.recommendation.update({
            where: { id: check.id },
            data: {
                score: -5,
            },
        });
        const voidBody = {};
        const { id } = check;
        await supertest(app).post(`/recommendations/${id}/downvote`).send(voidBody);
        const check2 = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        expect(check2).toBeNull();
    });
});

