// pages/api/socket.ts
import { Server as IOServer } from "socket.io";
import { NextApiRequest } from "next";
import { NextApiResponseWithSocket } from "@/types/socket"; // Create this type or use any

let users: string[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    res.end("Socket already initialized");
    return;
  }

  const io = new IOServer(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
  });

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);
    users.push(socket.id);

    if (users.length >= 2) {
      const [user1, user2] = users.splice(0, 2);
      io.to(user1).emit("partner", { partnerId: user2 });
      io.to(user2).emit("partner", { partnerId: user1 });
    }

    socket.on("signal", ({ to, data }) => {
      io.to(to).emit("signal", { from: socket.id, data });
    });

    socket.on("disconnect", () => {
      users = users.filter((id) => id !== socket.id);
    });
  });

  res.end("Socket initialized");
}
