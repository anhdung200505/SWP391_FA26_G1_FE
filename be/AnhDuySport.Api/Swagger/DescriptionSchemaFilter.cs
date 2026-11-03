using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Reflection;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace AnhDuySport.Api.Swagger;

// Đưa [Description] trên property vào Swagger, để requestType hiện là chữ tự nhập chứ không chỉ là string.
// MaxLength của record phải nằm trên tham số constructor; filter đọc cả hai chỗ.
public sealed class DescriptionSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        var description = context.MemberInfo?.GetCustomAttribute<DescriptionAttribute>()?.Description
            ?? context.ParameterInfo?.GetCustomAttribute<DescriptionAttribute>()?.Description;
        if (!string.IsNullOrWhiteSpace(description))
        {
            schema.Description = description;
        }

        var maxLength = context.MemberInfo?.GetCustomAttribute<MaxLengthAttribute>()?.Length
            ?? context.ParameterInfo?.GetCustomAttribute<MaxLengthAttribute>()?.Length
            ?? MaxLengthOnMatchingConstructorParameter(context.MemberInfo);
        if (maxLength is > 0)
        {
            schema.MaxLength = maxLength;
        }
    }

    private static int? MaxLengthOnMatchingConstructorParameter(MemberInfo? member)
    {
        if (member is not PropertyInfo property || property.DeclaringType is null)
        {
            return null;
        }

        return property.DeclaringType
            .GetConstructors()
            .SelectMany(constructor => constructor.GetParameters())
            .FirstOrDefault(parameter => string.Equals(parameter.Name, property.Name, StringComparison.OrdinalIgnoreCase))
            ?.GetCustomAttribute<MaxLengthAttribute>()
            ?.Length;
    }
}
