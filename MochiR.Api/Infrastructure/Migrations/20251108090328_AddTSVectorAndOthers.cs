using Microsoft.EntityFrameworkCore.Migrations;
using NpgsqlTypes;

#nullable disable

namespace MochiR.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTSVectorAndOthers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:citext", ",,")
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .Annotation("Npgsql:PostgresExtension:unaccent", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:unaccent", ",,");

            migrationBuilder.AlterColumn<string>(
                name: "Value",
                table: "ReviewTags",
                type: "citext",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(32)",
                oldMaxLength: 32);

            migrationBuilder.AddColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Subjects",
                type: "tsvector",
                nullable: true,
                computedColumnSql: "setweight(to_tsvector('simple', unaccent(coalesce(\"Name\", ''))), 'A') || setweight(to_tsvector('simple', unaccent(coalesce(\"Slug\", ''))), 'B')",
                stored: true);

            migrationBuilder.AddColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Reviews",
                type: "tsvector",
                nullable: true,
                computedColumnSql: "setweight(to_tsvector('simple', unaccent(coalesce(\"Title\", ''))), 'A') || setweight(to_tsvector('simple', unaccent(coalesce(\"Excerpt\", ''))), 'B') || setweight(to_tsvector('simple', unaccent(coalesce(\"Content\", ''))), 'C')",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subjects_SearchVector",
                table: "Subjects",
                column: "SearchVector")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "IX_ReviewTags_ReviewId_Value",
                table: "ReviewTags",
                columns: new[] { "ReviewId", "Value" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_SearchVector",
                table: "Reviews",
                column: "SearchVector")
                .Annotation("Npgsql:IndexMethod", "GIN");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Subjects_SearchVector",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "IX_ReviewTags_ReviewId_Value",
                table: "ReviewTags");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_SearchVector",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "SearchVector",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "SearchVector",
                table: "Reviews");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .Annotation("Npgsql:PostgresExtension:unaccent", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:citext", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:unaccent", ",,");

            migrationBuilder.AlterColumn<string>(
                name: "Value",
                table: "ReviewTags",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "citext",
                oldMaxLength: 32);
        }
    }
}
