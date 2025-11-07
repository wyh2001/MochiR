using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MochiR.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExcerpt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Excerpt",
                table: "Reviews",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Excerpt",
                table: "Reviews");
        }
    }
}
