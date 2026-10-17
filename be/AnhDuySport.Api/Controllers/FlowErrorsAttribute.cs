using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AnhDuySport.Api.Controllers;

// KeyNotFoundException -> 404, InvalidOperationException -> 400, cùng dạng { message }.
public sealed class FlowErrorsAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext context)
    {
        context.Result = context.Exception switch
        {
            KeyNotFoundException e => new NotFoundObjectResult(new { message = e.Message }),
            InvalidOperationException e => new BadRequestObjectResult(new { message = e.Message }),
            _ => null,
        };
        context.ExceptionHandled = context.Result is not null;
    }
}
