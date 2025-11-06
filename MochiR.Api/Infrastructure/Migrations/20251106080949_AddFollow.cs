using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MochiR.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFollow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Follows",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FollowerId = table.Column<string>(type: "text", nullable: false),
                    TargetType = table.Column<int>(type: "integer", nullable: false),
                    SubjectId = table.Column<int>(type: "integer", nullable: true),
                    SubjectTypeId = table.Column<int>(type: "integer", nullable: true),
                    FollowedUserId = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Follows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Follows_AspNetUsers_FollowedUserId",
                        column: x => x.FollowedUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Follows_AspNetUsers_FollowerId",
                        column: x => x.FollowerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Follows_SubjectTypes_SubjectTypeId",
                        column: x => x.SubjectTypeId,
                        principalTable: "SubjectTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Follows_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Follows_FollowedUserId",
                table: "Follows",
                column: "FollowedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Follows_FollowerId_TargetType_FollowedUserId",
                table: "Follows",
                columns: new[] { "FollowerId", "TargetType", "FollowedUserId" },
                unique: true,
                filter: "\"FollowedUserId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Follows_FollowerId_TargetType_SubjectId",
                table: "Follows",
                columns: new[] { "FollowerId", "TargetType", "SubjectId" },
                unique: true,
                filter: "\"SubjectId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Follows_FollowerId_TargetType_SubjectTypeId",
                table: "Follows",
                columns: new[] { "FollowerId", "TargetType", "SubjectTypeId" },
                unique: true,
                filter: "\"SubjectTypeId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Follows_SubjectId",
                table: "Follows",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Follows_SubjectTypeId",
                table: "Follows",
                column: "SubjectTypeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Follows");
        }
    }
}
