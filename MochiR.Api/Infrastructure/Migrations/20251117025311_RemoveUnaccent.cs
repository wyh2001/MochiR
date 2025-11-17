using Microsoft.EntityFrameworkCore.Migrations;
using NpgsqlTypes;

#nullable disable

namespace MochiR.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUnaccent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Subjects",
                type: "tsvector",
                nullable: true,
                computedColumnSql: "setweight(to_tsvector('simple', coalesce(\"Name\", '')), 'A') || setweight(to_tsvector('simple', coalesce(\"Slug\", '')), 'B')",
                stored: true,
                oldClrType: typeof(NpgsqlTsVector),
                oldType: "tsvector",
                oldNullable: true,
                oldComputedColumnSql: "setweight(to_tsvector('simple', unaccent(coalesce(\"Name\", ''))), 'A') || setweight(to_tsvector('simple', unaccent(coalesce(\"Slug\", ''))), 'B')",
                oldStored: true);

            migrationBuilder.AlterColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Reviews",
                type: "tsvector",
                nullable: true,
                computedColumnSql: "setweight(to_tsvector('simple', coalesce(\"Title\", '')), 'A') || setweight(to_tsvector('simple', coalesce(\"Excerpt\", '')), 'B') || setweight(to_tsvector('simple', coalesce(\"Content\", '')), 'C')",
                stored: true,
                oldClrType: typeof(NpgsqlTsVector),
                oldType: "tsvector",
                oldNullable: true,
                oldComputedColumnSql: "setweight(to_tsvector('simple', unaccent(coalesce(\"Title\", ''))), 'A') || setweight(to_tsvector('simple', unaccent(coalesce(\"Excerpt\", ''))), 'B') || setweight(to_tsvector('simple', unaccent(coalesce(\"Content\", ''))), 'C')",
                oldStored: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Subjects",
                type: "tsvector",
                nullable: true,
                computedColumnSql: "setweight(to_tsvector('simple', unaccent(coalesce(\"Name\", ''))), 'A') || setweight(to_tsvector('simple', unaccent(coalesce(\"Slug\", ''))), 'B')",
                stored: true,
                oldClrType: typeof(NpgsqlTsVector),
                oldType: "tsvector",
                oldNullable: true,
                oldComputedColumnSql: "setweight(to_tsvector('simple', coalesce(\"Name\", '')), 'A') || setweight(to_tsvector('simple', coalesce(\"Slug\", '')), 'B')",
                oldStored: true);

            migrationBuilder.AlterColumn<NpgsqlTsVector>(
                name: "SearchVector",
                table: "Reviews",
                type: "tsvector",
                nullable: true,
                computedColumnSql: "setweight(to_tsvector('simple', unaccent(coalesce(\"Title\", ''))), 'A') || setweight(to_tsvector('simple', unaccent(coalesce(\"Excerpt\", ''))), 'B') || setweight(to_tsvector('simple', unaccent(coalesce(\"Content\", ''))), 'C')",
                stored: true,
                oldClrType: typeof(NpgsqlTsVector),
                oldType: "tsvector",
                oldNullable: true,
                oldComputedColumnSql: "setweight(to_tsvector('simple', coalesce(\"Title\", '')), 'A') || setweight(to_tsvector('simple', coalesce(\"Excerpt\", '')), 'B') || setweight(to_tsvector('simple', coalesce(\"Content\", '')), 'C')",
                oldStored: true);
        }
    }
}
