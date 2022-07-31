import { faker } from "@faker-js/faker";
import supertest from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/database.js";

// 
const NAME = faker.internet.userName();
const LINK = "https://www.youtube.com/watch?v=5NV6Rdv1a3I";

// Clean the test database
beforeEach(async() => {
    await prisma.$transaction([
        prisma.$executeRaw`TRUNCATE TABLE recommendations`
    ]);
});


describe ("Route recommendations/", () => {
    it ("given name and youtubeLink, create a register, expect success", async () =>  {
        const body = { name: NAME, youtubeLink: LINK };
        const result = await supertest(app).post("/recommendations").send(body);
        expect(result.status).toEqual(201);
    });

    it ("variable name is not a string, expect failure", async () => {
        const name = 123456;
        const body = { name: name, youtubeLink: LINK };
        const result = await supertest(app).post("/recommendations").send(body);
        expect(result.status).toEqual(422);
    });

    it ("variable link is not a youtube link, expect failure", async () => {
        const link = "https://www.google.com";
        const body = { name: NAME, youtubeLink: link };
        const result = await supertest(app).post("/recommendations").send(body);
        expect(result.status).toEqual(422);
    });

    it  ("checks if the data passed by the body creates a record in the database, expect success", async () => {
        const body = { name: NAME, youtubeLink: LINK };
        await supertest(app).post("/recommendations").send(body);
        const check = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        expect(check).not.toBeNull();
        expect(check).not.toBeUndefined();
    });
});

describe ("Route recommendations/:id/upvote", () => {
    it ("Adiciona um voto", async () => {
        const body = { name: NAME, youtubeLink: LINK };
        await supertest(app).post("/recommendations").send(body);
        const check = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        const { id } = check;
        const voidBody = {};
        const result = await supertest(app).post(`/recommendations/${id}/upvote`).send(voidBody);
        expect(result.status).toEqual(200);
    });

    it ("Adiciona um voto em um id que não existe", async () => {
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
        const result = await supertest(app).post(`/recommendations/${id}/upvote`).send(voidBody);
        expect(result.status).toEqual(404);
    });

    it("Checar se o voto foi contado", async () => {
        const body = { name: NAME, youtubeLink: LINK };
        await supertest(app).post("/recommendations").send(body);
        const check = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        const { id } = check;
        const voidBody = {};
        await supertest(app).post(`/recommendations/${id}/upvote`).send(voidBody);
        const check2 = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        expect(check.score+1).toEqual(check2.score);
    });

    it("Checar se o voto foi contado", async () => {
        const body = { name: NAME, youtubeLink: LINK };
        await supertest(app).post("/recommendations").send(body);
        const check = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        const { id } = check;
        const voidBody = {};
        await supertest(app).post(`/recommendations/${id}/upvote`).send(voidBody);
        const check2 = await prisma.recommendation.findUnique({
            where: { name: NAME }
        });
        expect(check.score).toEqual(check2.score-1);
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
        const result = await supertest(app).post(`/recommendations/${id}/downvote`).send(voidBody);
        expect(result.status).toEqual(200);
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
        const result = await supertest(app).post(`/recommendations/${id}/downvote`).send(voidBody);
        expect(result.status).toEqual(404);
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