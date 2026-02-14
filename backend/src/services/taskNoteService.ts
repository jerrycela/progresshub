import prisma from "../config/database";

export interface CreateTaskNoteDto {
  taskId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: string;
}

export class TaskNoteService {
  /**
   * 取得任務的註記列表
   */
  async getNotesByTaskId(taskId: string) {
    return prisma.taskNote.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 新增任務註記
   */
  async createNote(data: CreateTaskNoteDto) {
    return prisma.taskNote.create({
      data: {
        taskId: data.taskId,
        content: data.content,
        authorId: data.authorId,
        authorName: data.authorName,
        authorRole: data.authorRole,
      },
    });
  }
}

export const taskNoteService = new TaskNoteService();
