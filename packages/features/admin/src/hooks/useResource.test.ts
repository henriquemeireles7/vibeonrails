import { describe, it, expect, vi } from "vitest";
import { createResourceManager } from "./useResource.js";

describe("createResourceManager", () => {
  it("creates a manager with initial empty state", () => {
    const manager = createResourceManager({
      fetchFn: async () => [],
    });

    expect(manager.getData()).toEqual([]);
    expect(manager.isLoading()).toBe(false);
    expect(manager.getError()).toBeNull();
  });

  it("fetches data on refetch", async () => {
    const mockData = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ];
    const manager = createResourceManager({
      fetchFn: async () => mockData,
    });

    await manager.refetch();

    expect(manager.getData()).toEqual(mockData);
    expect(manager.isLoading()).toBe(false);
    expect(manager.getError()).toBeNull();
  });

  it("sets error on fetch failure", async () => {
    const manager = createResourceManager({
      fetchFn: async () => {
        throw new Error("Network error");
      },
    });

    await manager.refetch();

    expect(manager.getData()).toEqual([]);
    expect(manager.getError()).toBe("Network error");
    expect(manager.isLoading()).toBe(false);
  });

  it("handles non-Error thrown values", async () => {
    const manager = createResourceManager({
      fetchFn: async () => {
        throw "string error";
      },
    });

    await manager.refetch();

    expect(manager.getError()).toBe("Unknown error");
  });

  it("calls deleteFn and refetches on remove", async () => {
    const deleteFn = vi.fn(async () => {});
    const fetchFn = vi.fn(async () => [{ id: "1", name: "Alice" }]);

    const manager = createResourceManager({ fetchFn, deleteFn });

    await manager.remove("1");

    expect(deleteFn).toHaveBeenCalledWith("1");
    expect(fetchFn).toHaveBeenCalled();
  });

  it("calls createFn and refetches on create", async () => {
    const createFn = vi.fn(async () => {});
    const fetchFn = vi.fn(async () => []);

    const manager = createResourceManager({ fetchFn, createFn });

    await manager.create({ name: "New Item" });

    expect(createFn).toHaveBeenCalledWith({ name: "New Item" });
    expect(fetchFn).toHaveBeenCalled();
  });

  it("calls updateFn and refetches on update", async () => {
    const updateFn = vi.fn(async () => {});
    const fetchFn = vi.fn(async () => []);

    const manager = createResourceManager({ fetchFn, updateFn });

    await manager.update("1", { name: "Updated" });

    expect(updateFn).toHaveBeenCalledWith("1", { name: "Updated" });
    expect(fetchFn).toHaveBeenCalled();
  });

  it("still refetches on remove even without deleteFn", async () => {
    const fetchFn = vi.fn(async () => []);

    const manager = createResourceManager({ fetchFn });

    await manager.remove("1");

    expect(fetchFn).toHaveBeenCalled();
  });

  it("still refetches on create even without createFn", async () => {
    const fetchFn = vi.fn(async () => []);

    const manager = createResourceManager({ fetchFn });

    await manager.create({ name: "Item" });

    expect(fetchFn).toHaveBeenCalled();
  });

  it("still refetches on update even without updateFn", async () => {
    const fetchFn = vi.fn(async () => []);

    const manager = createResourceManager({ fetchFn });

    await manager.update("1", { name: "Updated" });

    expect(fetchFn).toHaveBeenCalled();
  });

  it("clears previous error on successful refetch", async () => {
    let shouldFail = true;
    const manager = createResourceManager({
      fetchFn: async () => {
        if (shouldFail) throw new Error("fail");
        return [{ id: "1" }];
      },
    });

    await manager.refetch();
    expect(manager.getError()).toBe("fail");

    shouldFail = false;
    await manager.refetch();
    expect(manager.getError()).toBeNull();
    expect(manager.getData()).toEqual([{ id: "1" }]);
  });

  it("replaces data on each refetch", async () => {
    let callCount = 0;
    const manager = createResourceManager({
      fetchFn: async () => {
        callCount++;
        return [{ id: String(callCount) }];
      },
    });

    await manager.refetch();
    expect(manager.getData()).toEqual([{ id: "1" }]);

    await manager.refetch();
    expect(manager.getData()).toEqual([{ id: "2" }]);
  });
});
