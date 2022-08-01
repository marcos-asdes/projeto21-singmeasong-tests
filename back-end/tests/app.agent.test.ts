import { faker } from "@faker-js/faker";
import supertest from "supertest";
import app from "../src/app";

const agent = supertest.agent(app);
const recommendation = {
  name: faker.name.findName(),
  youtubeLink: "https://www.youtube.com/watch?v=LIz_gfv6lxM",
};

describe("Api Successes suite", () => {
  it("should create a recommendation", async () => {
    const response = await agent.post("/recommendations").send(recommendation);

    expect(response.statusCode).toBe(201);
  });
/*   it("should upvote a recommendation", async () => {
    const response = await agent.post("/recommendations/1/upvote");

    expect(response.statusCode).toBe(200);
  });
  it("should downvote a recommendation", async () => {
    const response = await agent.post("/recommendations/1/downvote");

    expect(response.statusCode).toBe(200);
  }); */
  it("should get a random recommendation", async () => {
    const response = await agent.get("/recommendations/random");

    expect(response.body).toHaveProperty("id");
  });
 /*  it("should get a recommendation by id", async () => {
    const response = await agent.get("/recommendations/1");

    expect(response.body).toHaveProperty("id");
  }); */
  it("should get top recommendations", async () => {
    const response = await agent.get("/recommendations/top/10");

    expect(response.body).toHaveProperty("length");
  });
  it("shoudl return all recommendations", async () => {
    const response = await agent.get("/recommendations");

    expect(response.body).toHaveProperty("length");
  });
});

describe("Api Errors suite", () => {
  it("should return a 404 status code", async () => {
    const response = await agent.get("/recommendations/12345/upvote");

    expect(response.statusCode).toBe(404);
  });
  it("should return a 409 status code", async () => {
    const response = await agent.post("/recommendations").send(recommendation);

    expect(response.statusCode).toBe(409);
  });
  it("should return a 422 status code", async () => {
    const response = await agent.post("/recommendations").send({});

    expect(response.statusCode).toBe(422);
  });
});
