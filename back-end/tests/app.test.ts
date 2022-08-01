import { faker } from "@faker-js/faker";
import supertest from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/database.js";

// Environment variables
const NAME: string = faker.internet.userName();
const LINK: string = "https://www.youtube.com/watch?v=5NV6Rdv1a3I";
const route: string = "/recommendations";
const voidBody: object = {};
const popDatabaseLength: number = 5;
const indexSelector: number = 0;

// Interface
interface recommendationProperties {
  id: number;
  name: string;
  youtubeLink: string;
  score: number;
}

// Clean test database
beforeEach(async () => {
  await prisma.$transaction([
    prisma.$executeRaw`TRUNCATE TABLE recommendations`,
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

async function check() {
  const check: recommendationProperties =
    await prisma.recommendation.findUnique({
      where: { name: NAME },
    });
  return check;
}

async function createRecommendation() {
  await postBody(route);
  const recommendation: recommendationProperties = await check();
  return recommendation;
}

async function get(route: string) {
  const response = await supertest(app).get(route);
  return response;
}

async function popDatabase() {
  for (let i = 0; i < popDatabaseLength; i++) {
    const name: string = faker.internet.userName();
    const body = { name: name, youtubeLink: LINK };
    await post(body, route);
  }
}

async function updateScore() {
  const findMany: recommendationProperties[] =
    await prisma.recommendation.findMany();
  for (let i = 0; i < findMany.length; i++) {
    await prisma.recommendation.update({
      where: { id: findMany[i].id },
      data: {
        score: Math.floor(Math.random() * 100) - 5,
      },
    });
  }
}

async function getManyRecommendations() {
  const manyRecommendations: recommendationProperties[] =
    await prisma.recommendation.findMany();
  return manyRecommendations;
}

// Integration tests
describe("Test suite: method post - route recommendations/", () => {
  it("given a name as string and a youtube link as string, execute a post, expect success", async () => {
    const response = await postBody(route);
    expect(response.status).toEqual(201);
  });

  it("given a name as number and a youtube link as string, execute a post, expect failure", async () => {
    const name: number = Math.random() * 100;
    const body = { name: name, youtubeLink: LINK };
    const response = await post(body, route);
    expect(response.status).toEqual(422);
  });

  it("given a name as string and a random link as string, execute a post, expect failure", async () => {
    const link: string = "https://www.google.com";
    const body = { name: NAME, youtubeLink: link };
    const response = await post(body, route);
    expect(response.status).toEqual(422);
  });

  it("checks if the data passed in the body creates a record in the database, expect success", async () => {
    const recommendation = await createRecommendation();
    expect(recommendation).not.toBeNull();
    expect(recommendation).not.toBeUndefined();
  });
});

describe("Test suite: method post - route recommendations/:id/upvote", () => {
  it("add one vote, expect success", async () => {
    const recommendation = await createRecommendation();
    const upvoteRoute: string = `/recommendations/${recommendation.id}/upvote`;
    const response = await post(voidBody, upvoteRoute);
    expect(response.status).toEqual(200);
  });

  it("add one vote on an id that doesn't exist, expect failure", async () => {
    const recommendation = await createRecommendation();
    const upvoteRoute: string = `/recommendations/${recommendation.id}/upvote`;
    await prisma.recommendation.delete({
      where: { name: NAME },
    });
    const response = await post(voidBody, upvoteRoute);
    expect(response.status).toEqual(404);
  });

  it("checks if the operation adds only one vote to the database, expect success", async () => {
    const recommendation = await createRecommendation();
    const upvoteRoute: string = `/recommendations/${recommendation.id}/upvote`;
    await post(voidBody, upvoteRoute);
    const newCheck = await check();
    expect(recommendation.score + 1).toEqual(newCheck.score);
  });

  it("double check of previous operation, expect success", async () => {
    const recommendation = await createRecommendation();
    const upvoteRoute: string = `/recommendations/${recommendation.id}/upvote`;
    await post(voidBody, upvoteRoute);
    const newCheck = await check();
    expect(recommendation.score).toEqual(newCheck.score - 1);
  });
});

describe("Test suite: method post - route recommendations/:id/downvote", () => {
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
    expect(recommendation.score - 1).toEqual(newCheck.score);
  });

  it("double check of previous operation, expect success", async () => {
    const recommendation = await createRecommendation();
    const downvoteRoute: string = `/recommendations/${recommendation.id}/downvote`;
    await post(voidBody, downvoteRoute);
    const newCheck = await check();
    expect(recommendation.score).toEqual(newCheck.score + 1);
  });

  it("decrease one vote on an id that doesn't exist, expect failure", async () => {
    const recommendation = await createRecommendation();
    const downvoteRoute: string = `/recommendations/${recommendation.id}/downvote`;
    await prisma.recommendation.delete({
      where: { name: NAME },
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

describe("Test suite: method get - route recommendations/", () => {
  beforeEach(async () => {
    await popDatabase();
  });

  it("get last 10 recommendations, expect success", async () => {
    const response = await get(route);
    expect(response.body.length).toBeLessThanOrEqual(10);
  });

  it("check if the object received in the get has the correct structure, expect success", async () => {
    const response = await get(route);
    expect(response.body[indexSelector]).toHaveProperty("name");
    expect(response.body[indexSelector]).toHaveProperty("youtubeLink");
    expect(response.body[indexSelector]).toHaveProperty("score");
    expect(response.body[indexSelector]).toHaveProperty("id");
    expect(response.body[indexSelector]).not.toHaveProperty("cheese");
  });
});

describe("Test suite: method get - route recommendations/:id", () => {
  beforeEach(async () => {
    await popDatabase();
  });

  it("get a recommendation by id, expect success", async () => {
    const recommendations: recommendationProperties[] =
      await getManyRecommendations();
    const getRouteById: string = `/recommendations/${recommendations[indexSelector].id}`;
    const response = await get(getRouteById);
    expect(response.body.id).toEqual(recommendations[indexSelector].id);
  });

  it("try get a recommendation for an ID that doesn't exist, expect failure", async () => {
    const recommendations: recommendationProperties[] = await getManyRecommendations();
    const getRouteById: string = `/recommendations/${recommendations[indexSelector].id}`;
    await prisma.recommendation.delete({
      where: { id: recommendations[indexSelector].id },
    });
    const response = await get(getRouteById);
    expect(response.status).toEqual(404);
  });

  it("check if the object received in the get has the correct structure, expect success", async () => {
    const recommendations: recommendationProperties[] = await getManyRecommendations();
    const getRouteById: string = `/recommendations/${recommendations[indexSelector].id}`;
    const response = await get(getRouteById);
    expect(response.body).toHaveProperty("name");
    expect(response.body).toHaveProperty("youtubeLink");
    expect(response.body).toHaveProperty("score");
    expect(response.body).toHaveProperty("id");
    expect(response.body).not.toHaveProperty("cheese");
  });
});

/* describe("Test suite: method get - route recommendations/top/:amount", () => {
  beforeEach(async () => {
    await popDatabase();
    await updateScore();
  }); */

/*   it("get recommendations by amount, expect success", async () => {
    const amount: number = 2;
    const getRouteByAmount: string = `recommendations/top/${amount}`;
    const response = await get(getRouteByAmount);
    console.log(response.body)
    expect(response.body.length).toEqual(amount);
  }); */
// checar se a rota responde com o amount pedido
// checar se o objeto tem a estrutura correta
// checar se os scores estão em ordem decrescente
//});
