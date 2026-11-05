using AnhDuySport.Api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace AnhDuySport.Api.Services;

public static class CourseMaterialPdf
{
    public static byte[] Render(string sportName, IReadOnlyList<SportCourseUnit> units)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        return Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(style => style.FontFamily("Arial").FontSize(11).FontColor(Colors.Black));
                page.Header().Column(column =>
                {
                    column.Item().Text("GIÁO TRÌNH").FontSize(11).FontColor(Colors.Grey.Darken2);
                    column.Item().PaddingTop(4).Text(sportName).FontSize(22).SemiBold();
                    column.Item().PaddingTop(8).PaddingBottom(12).Text(
                        "Mỗi dòng là một phần theo thứ tự từ đầu đến cuối. Cột ôn tập chỉ có chữ khi giáo trình ghi phải ôn nội dung đã học. Ô trống nghĩa là giáo trình không ghi yêu cầu đó.")
                        .FontSize(9).FontColor(Colors.Grey.Darken2);
                });
                page.Footer().AlignRight().Text(text =>
                {
                    text.Span("Trang ").FontSize(9).FontColor(Colors.Grey.Darken1);
                    text.CurrentPageNumber().FontSize(9).FontColor(Colors.Grey.Darken1);
                    text.Span(" / ").FontSize(9).FontColor(Colors.Grey.Darken1);
                    text.TotalPages().FontSize(9).FontColor(Colors.Grey.Darken1);
                });
                page.Content().Element(content =>
                {
                    if (units.Count == 0)
                    {
                        content.Text("Môn này chưa có buổi nào trong giáo trình.").FontSize(12);
                        return;
                    }

                    content.Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(2);
                        });
                        table.Header(header =>
                        {
                            header.Cell().Element(HeaderCell).Text("Buổi");
                            header.Cell().Element(HeaderCell).Text("Nội dung học");
                            header.Cell().Element(HeaderCell).Text("Ôn tập");
                        });
                        foreach (var unit in units)
                        {
                            table.Cell().Element(BodyCell).Text(unit.Label);
                            table.Cell().Element(BodyCell).Text(unit.Work);
                            table.Cell().Element(BodyCell).Text(string.IsNullOrWhiteSpace(unit.Review) ? "" : unit.Review);
                        }
                    });
                });
            });
        }).GeneratePdf();
    }

    private static IContainer HeaderCell(IContainer container) =>
        container.Background(Colors.Grey.Lighten3).Border(0.6f).BorderColor(Colors.Grey.Darken1).Padding(6).DefaultTextStyle(style => style.SemiBold());

    private static IContainer BodyCell(IContainer container) =>
        container.Border(0.6f).BorderColor(Colors.Grey.Lighten1).Padding(6);
}
