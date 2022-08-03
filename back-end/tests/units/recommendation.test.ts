/* import { faker } from "@faker-js/faker";
import app from "../../src/app.js";
import { prisma } from "../src/database.js"; */

import { jest } from "@jest/globals";

import { recommendationRepository } from "../../src/repositories/recommendationRepository";
import { recommendationService } from "../../src/services/recommendationsService";

jest.mock("../../src/repositories/recommendationRepository");

afterEach(() => {
  jest.clearAllMocks();
});

describe("test", () => {
  it("should ... nomes não podem repetir", async () => {
    jest
      .spyOn(recommendationRepository, "findByName")
      .mockImplementation((name: string): any => {
        return true;
      });
    jest
      .spyOn(recommendationRepository, "create")
      .mockImplementation((): any => {
        return null;
      });
    expect(
      recommendationService.insert({
        name: "Thais",
        youtubeLink: "http://www.youtube.com",
      })
    ).rejects.toEqual({
      type: "conflict",
      message: "Recommendations names must be unique",
    });
  });
});
